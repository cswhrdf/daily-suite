"""toolkit 应用的视图模块。

业务视图集按功能模块分组，在各实体落地时逐个加入本模块；
认证与权限沿用全局 DRF 配置，本模块不覆盖认证类。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, cast

from rest_framework import viewsets

from toolkit.models.tag import Tag
from toolkit.serializers import TagSerializer

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.db.models import QuerySet
    from rest_framework.serializers import BaseSerializer


class TagViewSet(viewsets.ModelViewSet[Tag]):
    """全局标签的增删改查视图集。

    查询集始终按当前登录用户过滤，因此访问他人的标签在取对象阶段即返回 404，
    不依赖额外的对象级权限类。
    """

    serializer_class = TagSerializer
    # 空查询集仅用于 schema 生成时推导模型与路径参数类型；
    # 实际查询始终由 ``get_queryset`` 按当前用户提供。
    queryset = Tag.objects.none()
    search_fields = ("name",)
    ordering_fields = ("name", "created_at")
    # 未显式传 ordering 时默认按名称升序，保证列表顺序稳定。
    ordering = ("name",)

    def get_queryset(self) -> QuerySet[Tag]:
        """只返回当前登录用户拥有的标签。"""
        # 全局 ``IsAuthenticated`` 已保证存在登录用户，这里的 cast 仅用于收窄类型。
        owner = cast("User", self.request.user)
        return Tag.objects.filter(owner=owner)

    def perform_create(self, serializer: BaseSerializer[Tag]) -> None:
        """落库时把标签归属设为当前登录用户。"""
        serializer.save(owner=self.request.user)
