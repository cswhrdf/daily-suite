"""脚手架阶段的最小视图：健康检查与 DRF 冒烟接口。"""

from django.http import HttpRequest, JsonResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from config.serializers import EchoSerializer


def health(_request: HttpRequest) -> JsonResponse:
    """返回最小健康检查响应。"""
    return JsonResponse({"status": "ok"})


class EchoView(APIView):
    """校验请求体后原样回显，用于验证 DRF 可用。"""

    permission_classes = (AllowAny,)

    @extend_schema(request=EchoSerializer, responses=EchoSerializer)
    def post(self, request: Request) -> Response:
        """校验传入的 ``message`` 字段并原样回显。"""
        serializer = EchoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
