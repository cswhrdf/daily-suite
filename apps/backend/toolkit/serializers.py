"""toolkit 应用的序列化器模块。

业务序列化器按功能模块分组，在各实体落地时逐个加入本模块；
写操作接收扁平的主键列表（如 ``tag_ids``），读操作返回嵌套摘要，
使前端在列表页可直接渲染标签胶囊，无需为每个实体补一次标签查询。
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any

from django.utils import timezone
from rest_framework import serializers

from toolkit.models.sticky_note import STICKY_NOTE_COLOR_CHOICES, StickyNote
from toolkit.models.tag import TAG_COLOR_CHOICES, Tag
from toolkit.models.todo import (
    TODO_PRIORITY_CHOICES,
    TODO_STATUS_CHOICES,
    TODO_STATUS_DONE,
    TODO_STATUS_PENDING,
    Todo,
)

if TYPE_CHECKING:
    from datetime import datetime

    from django.contrib.auth.models import User


def _ensure_own_tags(tags: list[Tag], owner: User) -> list[Tag]:
    """校验待关联的标签全部属于当前用户。

    ``tag_ids`` 的查询集是全局标签，跨用户主键同样能通过存在性校验，
    因此必须在字段校验阶段按归属再拦一次，避免把他人标签挂到自己的实体上。
    """
    if any(tag.owner_id != owner.pk for tag in tags):
        msg = "只能关联当前用户自己的标签。"
        raise serializers.ValidationError(msg)
    return tags


def _completed_at_for(status_value: str) -> datetime | None:
    """按状态派生完成时间：进入已完成记录当前时间，其余状态清空。"""
    if status_value == TODO_STATUS_DONE:
        return timezone.now()
    return None


class TagSummarySerializer(serializers.ModelSerializer[Tag]):
    """标签摘要序列化器。

    只暴露前端渲染标签胶囊所需的三个字段，挂在业务实体的读取结果里，
    避免读接口把整个标签对象（含时间戳）一并返回。
    """

    class Meta:
        """序列化器配置：三个字段全部只读。"""

        model = Tag
        fields = ("id", "name", "color")
        read_only_fields = ("id", "name", "color")


class TagSerializer(serializers.ModelSerializer[Tag]):
    """全局标签的读写序列化器。

    名称唯一性只在当前用户范围内校验，跨用户可重名；
    颜色必须落在受控色板内，非法取值返回中文字段错误。
    """

    # 显式声明颜色字段，把受控色板与前端的取值保持一致，并对非法值给出中文提示。
    color = serializers.ChoiceField(
        choices=TAG_COLOR_CHOICES,
        error_messages={
            "invalid_choice": "颜色不在受控色板内，请选择允许的颜色值。",
            "required": "请选择颜色。",
        },
    )
    # 显式声明名称字段，以便空值与缺失都返回中文提示。
    name = serializers.CharField(
        max_length=50,
        error_messages={
            "blank": "名称不能为空。",
            "required": "请输入名称。",
        },
    )

    class Meta:
        """序列化器配置：暴露字段与只读约束。"""

        model = Tag
        fields = ("id", "name", "color", "created_at", "updated_at")
        read_only_fields = ("id", "created_at", "updated_at")

    def validate_name(self, value: str) -> str:
        """校验同一用户名下的标签名称唯一。

        ``owner`` 不在序列化字段里，故不能依赖 ``UniqueTogetherValidator``，
        这里按请求用户显式查询；更新时排除自身，允许保持原名不变。
        """
        owner = self.context["request"].user
        queryset = Tag.objects.filter(owner=owner, name=value)
        if self.instance is not None:
            queryset = queryset.exclude(pk=self.instance.pk)
        if queryset.exists():
            msg = "当前用户下已存在同名标签。"
            raise serializers.ValidationError(msg)
        return value


class StickyNoteSerializer(serializers.ModelSerializer[StickyNote]):
    """便签的读写序列化器。

    写操作接收 ``tag_ids`` 主键列表，读操作返回 ``tags`` 摘要数组；
    底色必须落在受控色板内，``position`` 与时间戳一律由服务端维护，
    因此客户端即使传入也会被忽略。
    """

    # 显式声明底色字段：受控色板由后端统一定义，非法取值给出中文提示。
    # 未传时沿用模型默认色，故声明为可选，避免新建便签被强制要求带底色。
    color = serializers.ChoiceField(
        choices=STICKY_NOTE_COLOR_CHOICES,
        required=False,
        error_messages={"invalid_choice": "底色不在受控色板内，请选择允许的颜色值。"},
    )
    # 写入用扁平主键列表，读出用嵌套摘要：两者共用 ``tags`` 关联，但方向互斥。
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        write_only=True,
        source="tags",
        allow_empty=True,
        required=False,
        error_messages={"does_not_exist": "标签不存在。"},
    )
    tags = TagSummarySerializer(many=True, read_only=True)

    class Meta:
        """序列化器配置：暴露字段与只读约束。"""

        model = StickyNote
        fields = (
            "id",
            "title",
            "content",
            "color",
            "is_pinned",
            "is_archived",
            "position",
            "tags",
            "tag_ids",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "position", "created_at", "updated_at")

    def validate_tag_ids(self, value: list[Tag]) -> list[Tag]:
        """只允许关联当前用户自己的标签。"""
        owner = self.context["request"].user
        return _ensure_own_tags(value, owner)


class TodoSerializer(serializers.ModelSerializer[Todo]):
    """轻量待办序列化器。

    本阶段只服务于便签转待办的创建与响应，待办自身的接口落地后会在本类上继续扩展；
    ``completed_at`` 由 ``status`` 派生，属于服务端维护字段，故整体只读。
    """

    status = serializers.ChoiceField(
        choices=TODO_STATUS_CHOICES,
        required=False,
        error_messages={"invalid_choice": "状态不在允许范围内。"},
    )
    priority = serializers.ChoiceField(
        choices=TODO_PRIORITY_CHOICES,
        required=False,
        error_messages={"invalid_choice": "优先级不在允许范围内。"},
    )
    tag_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Tag.objects.all(),
        write_only=True,
        source="tags",
        allow_empty=True,
        required=False,
        error_messages={"does_not_exist": "标签不存在。"},
    )
    tags = TagSummarySerializer(many=True, read_only=True)

    class Meta:
        """序列化器配置：暴露字段与只读约束。"""

        model = Todo
        fields = (
            "id",
            "title",
            "description",
            "status",
            "priority",
            "due_at",
            "position",
            "parent",
            "source_sticky_note",
            "completed_at",
            "tags",
            "tag_ids",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "position",
            "source_sticky_note",
            "completed_at",
            "created_at",
            "updated_at",
        )

    def validate_tag_ids(self, value: list[Tag]) -> list[Tag]:
        """只允许关联当前用户自己的标签。"""
        owner = self.context["request"].user
        return _ensure_own_tags(value, owner)

    def create(self, validated_data: dict[str, Any]) -> Todo:
        """创建待办，并按状态补齐完成时间。"""
        status_value = validated_data.get("status", TODO_STATUS_PENDING)
        validated_data["completed_at"] = _completed_at_for(status_value)
        return super().create(validated_data)

    def update(self, instance: Todo, validated_data: dict[str, Any]) -> Todo:
        """更新待办；本次请求改动了状态时同步完成时间，否则保持不变。"""
        if "status" in validated_data:
            validated_data["completed_at"] = _completed_at_for(validated_data["status"])
        return super().update(instance, validated_data)


class StickyNoteConvertToTodoSerializer(serializers.Serializer[Any]):
    """便签转待办的请求体。

    三个字段均可选：缺省时沿用待办模型的默认状态与优先级，
    截止时间按 ISO 8601 解析，非法取值返回中文字段错误。
    """

    due_at = serializers.DateTimeField(
        required=False,
        error_messages={"invalid": "截止时间格式不正确，请使用 ISO 8601 格式。"},
    )
    priority = serializers.ChoiceField(
        choices=TODO_PRIORITY_CHOICES,
        required=False,
        error_messages={"invalid_choice": "优先级不在允许范围内。"},
    )
    status = serializers.ChoiceField(
        choices=TODO_STATUS_CHOICES,
        required=False,
        error_messages={"invalid_choice": "状态不在允许范围内。"},
    )


class StickyNoteConvertToTodoResultSerializer(serializers.Serializer[Any]):
    """便签转待办的响应体：原便签与新待办的完整序列化结果。

    便于前端在同一个响应里刷新便签卡片状态并插入新待办，不必再发两次读请求。
    """

    sticky_note = StickyNoteSerializer(read_only=True)
    todo = TodoSerializer(read_only=True)


class StickyNoteReorderSerializer(serializers.Serializer[Any]):
    """便签重排的请求体：``ordered_ids`` 为全量便签主键的有序列表。"""

    ordered_ids = serializers.ListField(
        child=serializers.IntegerField(error_messages={"invalid": "便签 ID 必须是整数。"}),
        allow_empty=False,
        error_messages={
            "required": "请提供 ordered_ids。",
            "not_a_list": "ordered_ids 必须是整数列表。",
            "empty": "ordered_ids 不能为空。",
        },
    )
