"""toolkit 应用的序列化器模块。

业务序列化器按功能模块分组，在各实体落地时逐个加入本模块。
"""

from __future__ import annotations

from rest_framework import serializers

from toolkit.models.tag import TAG_COLOR_CHOICES, Tag


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
