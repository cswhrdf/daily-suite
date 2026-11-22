"""Refresh Token Cookie 的读取、下发与清除。

Cookie 名称、路径、域、Secure / httpOnly / SameSite 等属性统一从
``settings.SIMPLE_JWT`` 读取（见 ``config.settings.base``），视图代码不硬编码。

注意：simplejwt 的 ``api_settings`` 只认它自己 DEFAULTS 里的键，自定义的
``AUTH_COOKIE*`` 必须直接从 Django settings 读取。
"""

from typing import Literal, TypedDict, cast

from django.conf import settings
from django.http import HttpResponse
from rest_framework.request import Request

SameSite = Literal["Lax", "Strict", "None"]


class AuthCookieSettings(TypedDict):
    """``SIMPLE_JWT`` 中与 Refresh Token Cookie 相关的键。"""

    AUTH_COOKIE: str
    AUTH_COOKIE_PATH: str
    AUTH_COOKIE_DOMAIN: str | None
    AUTH_COOKIE_SECURE: bool
    AUTH_COOKIE_HTTP_ONLY: bool
    AUTH_COOKIE_SAMESITE: SameSite
    AUTH_COOKIE_MAX_AGE: int


def cookie_settings() -> AuthCookieSettings:
    """返回当前生效的 Cookie 配置（每次调用都读最新 settings，便于测试覆盖）。"""
    return cast("AuthCookieSettings", settings.SIMPLE_JWT)


def set_refresh_cookie(response: HttpResponse, raw_token: str) -> None:
    """把 Refresh Token 写入 ``httpOnly`` Cookie。

    前端脚本无法读取该 Cookie；浏览器会在后续请求中自动携带。
    """
    config = cookie_settings()
    response.set_cookie(
        key=config["AUTH_COOKIE"],
        value=raw_token,
        max_age=config["AUTH_COOKIE_MAX_AGE"],
        secure=config["AUTH_COOKIE_SECURE"],
        httponly=config["AUTH_COOKIE_HTTP_ONLY"],
        samesite=config["AUTH_COOKIE_SAMESITE"],
        path=config["AUTH_COOKIE_PATH"],
        domain=config["AUTH_COOKIE_DOMAIN"],
    )


def clear_refresh_cookie(response: HttpResponse) -> None:
    """清除 Refresh Token Cookie。

    删除时必须与写入时的 path / domain 保持一致，否则浏览器不会覆盖原 Cookie。
    """
    config = cookie_settings()
    response.delete_cookie(
        key=config["AUTH_COOKIE"],
        path=config["AUTH_COOKIE_PATH"],
        domain=config["AUTH_COOKIE_DOMAIN"],
        samesite=config["AUTH_COOKIE_SAMESITE"],
    )


def get_refresh_cookie(request: Request) -> str | None:
    """读取请求携带的 Refresh Token；缺失或为空串时返回 ``None``。"""
    value = request.COOKIES.get(cookie_settings()["AUTH_COOKIE"])
    if value:
        return value
    return None
