"""基础序列化器：仅用于脚手架连通性验证。"""

from typing import Any

from rest_framework import serializers


class EchoSerializer(serializers.Serializer[dict[str, Any]]):
    """回显输入内容，用于验证 DRF 序列化器往返。"""

    message = serializers.CharField(max_length=200)
