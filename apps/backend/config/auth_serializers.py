"""JWT 认证端点的请求与响应序列化器。"""

from django.utils.translation import gettext_lazy as _
from rest_framework import serializers


class LoginSerializer(serializers.Serializer[dict[str, str]]):
    """登录请求体：用户名 + 密码。"""

    username = serializers.CharField(
        label=_("用户名"),
        help_text=_("登录使用的账号名。"),
        max_length=150,
        trim_whitespace=True,
    )
    password = serializers.CharField(
        label=_("密码"),
        help_text=_("账号对应的密码。"),
        max_length=128,
        trim_whitespace=False,
        style={"input_type": "password"},
    )


class AccessTokenSerializer(serializers.Serializer[dict[str, str]]):
    """只返回 Access Token；Refresh Token 走 httpOnly Cookie。"""

    access = serializers.CharField(read_only=True)
