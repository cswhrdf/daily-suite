"""toolkit 应用的视图模块。

业务视图集按功能模块分组，在各实体落地时逐个加入本模块；
认证与权限沿用全局 DRF 配置，本模块不覆盖认证类。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any, cast

from django.db import transaction
from django.db.models import Max
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from toolkit.filters import StickyNoteFilterSet
from toolkit.models.sticky_note import StickyNote
from toolkit.models.tag import Tag
from toolkit.models.todo import Todo
from toolkit.serializers import (
    StickyNoteConvertToTodoResultSerializer,
    StickyNoteConvertToTodoSerializer,
    StickyNoteReorderSerializer,
    StickyNoteSerializer,
    TagSerializer,
    TodoSerializer,
)

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from django.db.models import QuerySet
    from rest_framework.request import Request
    from rest_framework.serializers import BaseSerializer

# 便签列表的默认排序：置顶在前，同组内按手工位置升序。
STICKY_NOTE_DEFAULT_ORDERING: tuple[str, ...] = ("-is_pinned", "position")

# 便签标题与内容都为空时，转出的待办所用的兜底标题。
TODO_TITLE_FALLBACK = "未命名待办"


def _lock_owner_row(owner: User) -> None:
    """在事务内锁住当前用户行，串行化同一用户的排序位置分配。

    便签与待办的 ``position`` 都由「当前最大值 + 1」算出，同一用户并发新建时
    两个请求可能读到同一个最大值而抢到相同位置；锁住用户行后位置分配按用户串行，
    不同用户之间互不阻塞。
    """
    type(owner).objects.select_for_update().get(pk=owner.pk)


def _next_position(model: type[StickyNote | Todo], owner: User) -> int:
    """返回该用户在给定模型中追加一条记录时应使用的 ``position``，空集合从 0 开始。"""
    highest = model.objects.filter(owner=owner).aggregate(highest=Max("position"))["highest"]
    return 0 if highest is None else int(highest) + 1


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


class StickyNoteViewSet(viewsets.ModelViewSet[StickyNote]):
    """便签的增删改查视图集，附带整体重排与转待办两个动作。

    查询集始终按当前登录用户过滤，访问他人便签在取对象阶段即返回 404；
    列表未显式指定归档条件时只返回未归档便签，归档分组需带 ``is_archived=true``。
    """

    serializer_class = StickyNoteSerializer
    # 空查询集仅用于 schema 生成时推导模型与路径参数类型；
    # 实际查询始终由 ``get_queryset`` 按当前用户提供。
    queryset = StickyNote.objects.none()
    # ``tag`` 接收标签主键，便于前端按标签筛选便签；``is_archived`` 决定展示哪个分组。
    filterset_class = StickyNoteFilterSet
    search_fields = ("title", "content")
    # 显式白名单：只有这四个字段可排序，避免客户端按任意字段排序暴露内部结构。
    # 包含 ``is_pinned`` 是为了让客户端显式传 ``ordering=-is_pinned,position``
    # 时仍能保留置顶优先，而不是被过滤成只剩 ``position``。
    ordering_fields = ("is_pinned", "position", "created_at", "updated_at")
    ordering = STICKY_NOTE_DEFAULT_ORDERING

    def get_queryset(self) -> QuerySet[StickyNote]:
        """只返回当前用户的便签；列表默认排除归档，其余动作可直达归档便签。"""
        # 全局 ``IsAuthenticated`` 已保证存在登录用户，这里的 cast 仅用于收窄类型。
        owner = cast("User", self.request.user)
        queryset = StickyNote.objects.filter(owner=owner)
        # 列表未显式传归档条件时补上「未归档」，保持列表页默认只展示活跃便签；
        # 详情、更新、删除等动作保留全部便签，否则归档便签无法被恢复或删除。
        if self.action == "list" and self.request.query_params.get("is_archived") is None:
            queryset = queryset.filter(is_archived=False)
        return queryset

    def perform_create(self, serializer: BaseSerializer[StickyNote]) -> None:
        """落库时归属当前用户，并把新便签追加到该用户便签的末尾。"""
        owner = cast("User", self.request.user)
        with transaction.atomic():
            _lock_owner_row(owner)
            serializer.save(owner=owner, position=_next_position(StickyNote, owner))

    @extend_schema(
        request=StickyNoteReorderSerializer,
        responses=StickyNoteSerializer(many=True),
    )
    @action(detail=False, methods=["post"], url_path="reorder")
    def reorder(self, request: Request) -> Response:
        """按 ``ordered_ids`` 的顺序整体重写当前用户未归档便签的 ``position``。

        先把三类非法入参（重复 ID、数量不符、含他人 ID）全部校验完，再在单个事务里
        写入，因此任一条校验失败都返回 400 且数据库中位置保持不变。
        """
        owner = cast("User", request.user)
        payload = StickyNoteReorderSerializer(data=request.data)
        payload.is_valid(raise_exception=True)
        ordered_ids: list[int] = payload.validated_data["ordered_ids"]

        active_notes = StickyNote.objects.filter(owner=owner, is_archived=False)
        notes = {note.pk: note for note in active_notes}

        with transaction.atomic():
            _ensure_reorderable(ordered_ids, list(notes))
            for index, note_id in enumerate(ordered_ids):
                notes[note_id].position = index
            StickyNote.objects.bulk_update(list(notes.values()), ["position"])

        ordered_notes = [notes[note_id] for note_id in ordered_ids]
        return Response(self.get_serializer(ordered_notes, many=True).data)

    @extend_schema(
        request=StickyNoteConvertToTodoSerializer,
        responses=StickyNoteConvertToTodoResultSerializer,
    )
    @action(detail=True, methods=["post"], url_path="convert-to-todo")
    def convert_to_todo(
        self,
        request: Request,
        pk: str | None = None,  # noqa: ARG002 - pk 由 DRF 路由注入，取对象统一走 get_object
    ) -> Response:
        """把便签复制成一条待办，便签本身保留。

        ``due_at``/``priority``/``status`` 均可选，非法取值在写入前即返回 400；
        便签的标签复制到待办上，来源便签写入 ``source_sticky_note`` 便于回查。
        """
        # 便签获取走 ``get_queryset``，他人便签在此即 404，后续不产生任何写入。
        note = self.get_object()
        owner = cast("User", request.user)
        options = StickyNoteConvertToTodoSerializer(data=request.data)
        options.is_valid(raise_exception=True)

        # 标题为空时退化为内容摘要，两者都为空才使用兜底标题，保证待办标题非空。
        payload: dict[str, Any] = {
            "title": note.title or note.content[:50] or TODO_TITLE_FALLBACK,
            "description": note.content,
            **cast("dict[str, Any]", options.validated_data),
        }
        serializer = TodoSerializer(data=payload, context=self.get_serializer_context())
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            _lock_owner_row(owner)
            todo = serializer.save(
                owner=owner,
                position=_next_position(Todo, owner),
                source_sticky_note=note,
                tags=list(note.tags.all()),
            )
        result = {"sticky_note": note, "todo": todo}
        return Response(StickyNoteConvertToTodoResultSerializer(result).data)


def _ensure_reorderable(ordered_ids: list[int], owned_ids: list[int]) -> None:
    """校验重排入参：不得重复、数量须与当前集合一致、且全部属于当前用户。

    ``owned_ids`` 是当前用户未归档便签的主键集合，校验顺序固定为
    「重复 → 数量 → 归属」，让前端能按不同错误提示定位问题。
    """
    if len(set(ordered_ids)) != len(ordered_ids):
        msg = "ordered_ids 中不能包含重复的便签 ID。"
        raise serializers.ValidationError(msg)
    if len(ordered_ids) != len(owned_ids):
        msg = "ordered_ids 必须包含当前用户的全部未归档便签。"
        raise serializers.ValidationError(msg)
    if set(ordered_ids) != set(owned_ids):
        msg = "ordered_ids 中存在不属于当前用户的便签 ID。"
        raise serializers.ValidationError(msg)
