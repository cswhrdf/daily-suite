"""刷新令牌轮换的补充回归用例：旧 Cookie 重放必须被拒绝。

原为临时调试脚本（打印状态码），改为正式断言以免让 ruff(T201)/mypy 门禁失败；
主流程覆盖仍在 test_auth.py，这里只做最小回归保护。
"""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

COOKIE_NAME = "daily_suite_refresh"


@pytest.mark.django_db
def test_refresh_replay_with_rotated_cookie_is_rejected(client: Client) -> None:
    """轮换后使用旧 Refresh Cookie 重放应返回 401。"""
    user_model = get_user_model()
    user_model.objects.create_user(username="bob", password="pw")  # noqa: S106 - 测试专用口令

    login = client.post(
        reverse("auth-login"),
        data={"username": "bob", "password": "pw"},
        content_type="application/json",
    )
    assert login.status_code == 200
    old = str(login.cookies[COOKIE_NAME].value)

    first = client.post(reverse("auth-refresh"), COOKIES={COOKIE_NAME: old})
    assert first.status_code == 200

    replay = Client().post(reverse("auth-refresh"), COOKIES={COOKIE_NAME: old})
    assert replay.status_code == 401
