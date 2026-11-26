"""JWT 认证端点：登录 / 刷新 / 登出。

- Access Token 由响应体返回，前端只保存在内存中；
- Refresh Token 只经 ``httpOnly`` Cookie 往返，前端脚本不可读取；
- 刷新时轮换 Refresh Token，旧令牌进入黑名单（``ROTATE_REFRESH_TOKENS`` /
  ``BLACKLIST_AFTER_ROTATION``）；
- 登出把 Cookie 中的 Refresh Token 拉黑并清除 Cookie。

认证类刻意留空：这些端点靠 Cookie 而非 ``Authorization`` 头工作，若启用
``JWTAuthentication``，过期的 Access Token 会让刷新请求本身失败。失败分支
统一显式返回 401，避免 DRF 在「无 authenticator」时把 401 降级为 403。
"""

from contextlib import suppress

from django.contrib.auth import authenticate
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import status
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import (
    TokenBlacklistSerializer,
    TokenRefreshSerializer,
)
from rest_framework_simplejwt.tokens import RefreshToken

from config.auth_cookies import clear_refresh_cookie, get_refresh_cookie, set_refresh_cookie
from config.auth_serializers import AccessTokenSerializer, LoginSerializer


class LoginView(APIView):
    """校验凭据并签发 Access Token + Refresh Cookie。"""

    authentication_classes: tuple[type[BaseAuthentication], ...] = ()
    permission_classes = (AllowAny,)

    @extend_schema(
        request=LoginSerializer,
        responses={status.HTTP_200_OK: AccessTokenSerializer},
    )
    def post(self, request: Request) -> Response:
        """校验用户名密码，成功时返回 Access Token 并下发 Refresh Cookie。"""
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        credentials = serializer.validated_data
        user = authenticate(
            request=request,
            username=credentials["username"],
            password=credentials["password"],
        )
        if user is None:
            return Response(
                {"detail": "用户名或密码错误。"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        refresh = RefreshToken.for_user(user)
        response = Response({"access": str(refresh.access_token)})
        set_refresh_cookie(response, str(refresh))
        return response


class RefreshView(APIView):
    """用 Cookie 中的 Refresh Token 换取新的 Access Token。"""

    authentication_classes: tuple[type[BaseAuthentication], ...] = ()
    permission_classes = (AllowAny,)

    @extend_schema(
        request=None,
        responses={status.HTTP_200_OK: AccessTokenSerializer},
    )
    def post(self, request: Request) -> Response:
        """校验并轮换 Refresh Token，返回新的 Access Token。"""
        raw_refresh = get_refresh_cookie(request)
        if raw_refresh is None:
            return Response(
                {"detail": "缺少 Refresh Token Cookie。"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        # TokenRefreshSerializer 按 SIMPLE_JWT 决定是否轮换 / 拉黑旧令牌。
        refresh_serializer = TokenRefreshSerializer(data={"refresh": raw_refresh})
        try:
            refresh_serializer.is_valid(raise_exception=True)
        except (TokenError, AuthenticationFailed):
            return Response(
                {"detail": "刷新凭据无效或已过期。"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        validated = refresh_serializer.validated_data
        response = Response({"access": validated["access"]})
        # 开启轮换时返回新 refresh；未开启时沿用原值重写，行为一致。
        set_refresh_cookie(response, validated.get("refresh", raw_refresh))
        return response


class LogoutView(APIView):
    """吊销 Refresh Token 并清除 Cookie。"""

    authentication_classes: tuple[type[BaseAuthentication], ...] = ()
    permission_classes = (AllowAny,)

    @extend_schema(
        request=None,
        responses={
            status.HTTP_204_NO_CONTENT: OpenApiResponse(description="已登出，Cookie 已清除"),
        },
    )
    def post(self, request: Request) -> Response:
        """把 Cookie 中的 Refresh Token 加入黑名单，并清除 Cookie。"""
        raw_refresh = get_refresh_cookie(request)
        if raw_refresh is not None:
            # 已过期 / 已拉黑的令牌同样视为登出成功，保持接口幂等。
            blacklist_serializer = TokenBlacklistSerializer(data={"refresh": raw_refresh})
            with suppress(TokenError, AuthenticationFailed):
                blacklist_serializer.is_valid(raise_exception=True)
        response = Response(status=status.HTTP_204_NO_CONTENT)
        clear_refresh_cookie(response)
        return response
