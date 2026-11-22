"""JWT 认证端点测试：登录、刷新（轮换 + 拉黑）、登出（吊销）。"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

import jwt
import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import Client, override_settings
from django.urls import reverse
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken

if TYPE_CHECKING:
    # 只在类型检查时存在：django-stubs 用它标注测试客户端的响应类型。
    from django.db.models import Model
    from django.test.client import _MonkeyPatchedWSGIResponse

COOKIE_NAME = "daily_suite_refresh"
USERNAME = "alice"
PASSWORD = "correct-horse-battery"  # noqa: S105 - 测试专用固定口令

User = get_user_model()


def create_user() -> Model:
    """创建测试用户（测试环境用 MD5 哈希，速度优先）。"""
    return User.objects.create_user(username=USERNAME, password=PASSWORD)


def login(client: Client, password: str = PASSWORD) -> _MonkeyPatchedWSGIResponse:
    """调用登录接口并返回原始响应。"""
    return client.post(
        reverse("auth-login"),
        data={"username": USERNAME, "password": password},
        content_type="application/json",
    )


def refresh_token_of(response: _MonkeyPatchedWSGIResponse) -> str:
    """从登录/刷新响应的 Set-Cookie 中取出 Refresh Token。"""
    return str(response.cookies[COOKIE_NAME].value)


def set_refresh_cookie(client: Client, raw_token: str) -> None:
    """把 Refresh Token 放进测试客户端的 CookieJar。

    Django 6 的测试客户端已不再支持 ``COOKIES=`` 请求参数，只能直接操作 CookieJar。
    """
    client.cookies[COOKIE_NAME] = raw_token


@pytest.mark.django_db
def test_login_returns_access_token_and_sets_httponly_cookie(client: Client) -> None:
    user = create_user()

    response = login(client)

    assert response.status_code == 200
    payload = response.json()
    # Refresh Token 绝不出现在响应体里，只能走 Cookie。
    assert set(payload) == {"access"}

    cookie = response.cookies[COOKIE_NAME]
    assert str(cookie.value) != ""
    assert cookie["httponly"] is True
    assert cookie["secure"] is True
    assert cookie["samesite"] == "Lax"
    assert cookie["path"] == "/api/auth"
    max_age = cookie["max-age"]
    assert isinstance(max_age, int)
    assert max_age == settings.SIMPLE_JWT["AUTH_COOKIE_MAX_AGE"]

    claims = _decode_access_token(str(payload["access"]))
    assert str(claims["user_id"]) == str(user.pk)


@pytest.mark.django_db
def test_login_rejects_invalid_credentials(client: Client) -> None:
    create_user()

    response = login(client, password="wrong-password")  # noqa: S106 - 反例口令

    assert response.status_code == 401
    assert response.json()["detail"] == "用户名或密码错误。"
    assert COOKIE_NAME not in response.cookies


@pytest.mark.django_db
def test_login_rejects_missing_fields(client: Client) -> None:
    response = client.post(
        reverse("auth-login"),
        data={"username": USERNAME},
        content_type="application/json",
    )

    assert response.status_code == 400


@pytest.mark.django_db
def test_login_cookie_secure_flag_follows_settings(client: Client) -> None:
    create_user()
    insecure_settings = {**settings.SIMPLE_JWT, "AUTH_COOKIE_SECURE": False}

    with override_settings(SIMPLE_JWT=insecure_settings):
        response = login(client)

    assert response.status_code == 200
    # 本地 http 联调时 secure 必须可关闭，否则浏览器不会保存 Cookie。
    # 未设置的 Morsel 属性返回空串，因此用假值断言。
    assert not response.cookies[COOKIE_NAME]["secure"]


@pytest.mark.django_db
def test_refresh_rotates_token_and_blacklists_old_one(client: Client) -> None:
    user = create_user()
    old_refresh = refresh_token_of(login(client))

    set_refresh_cookie(client, old_refresh)
    response = client.post(reverse("auth-refresh"))

    assert response.status_code == 200
    claims = _decode_access_token(str(response.json()["access"]))
    assert str(claims["user_id"]) == str(user.pk)
    new_refresh = refresh_token_of(response)
    assert new_refresh != old_refresh
    assert BlacklistedToken.objects.count() == 1

    # 旧 Refresh Token 已被拉黑，不能再次换取 Access Token。
    # 必须换一个新 client：原 client 的 CookieJar 已存有轮换后的新 Cookie。
    replay_client = Client()
    set_refresh_cookie(replay_client, old_refresh)
    replay = replay_client.post(reverse("auth-refresh"))
    assert replay.status_code == 401


def test_refresh_requires_cookie(client: Client) -> None:
    response = client.post(reverse("auth-refresh"))

    assert response.status_code == 401
    assert response.json()["detail"] == "缺少 Refresh Token Cookie。"


def test_refresh_rejects_invalid_cookie(client: Client) -> None:
    set_refresh_cookie(client, "not-a-jwt")

    response = client.post(reverse("auth-refresh"))

    assert response.status_code == 401
    assert response.json()["detail"] == "刷新凭据无效或已过期。"


@pytest.mark.django_db
def test_logout_blacklists_refresh_token_and_clears_cookie(client: Client) -> None:
    create_user()
    raw_refresh = refresh_token_of(login(client))

    set_refresh_cookie(client, raw_refresh)
    response = client.post(reverse("auth-logout"))

    assert response.status_code == 204
    cleared = response.cookies[COOKIE_NAME]
    assert cleared.value == ""
    assert cleared["max-age"] == 0
    assert BlacklistedToken.objects.count() == 1

    # 登出后同一个 Refresh Token 立即失效。
    replay_client = Client()
    set_refresh_cookie(replay_client, raw_refresh)
    replay = replay_client.post(reverse("auth-refresh"))
    assert replay.status_code == 401


def test_logout_without_cookie_still_clears_cookie(client: Client) -> None:
    response = client.post(reverse("auth-logout"))

    assert response.status_code == 204
    assert response.cookies[COOKIE_NAME].value == ""


def test_logout_with_invalid_cookie_is_idempotent(client: Client) -> None:
    set_refresh_cookie(client, "not-a-jwt")

    response = client.post(reverse("auth-logout"))

    assert response.status_code == 204
    assert response.cookies[COOKIE_NAME].value == ""


def _decode_access_token(raw_token: str) -> dict[str, Any]:
    """用 PyJWT 校验 Access Token 签名并返回 Claims。"""
    return jwt.decode(raw_token, str(settings.SECRET_KEY), algorithms=["HS256"])
