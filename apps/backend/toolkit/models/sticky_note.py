"""便签模型模块。

便签是用户随手记录的短文本载体，支持自定义底色、置顶、归档与标签关联；
``position`` 表示用户手工拖拽后的排序位置，置顶只在读取排序时优先，
不改写 ``position`` 本身，因此取消置顶后便签回到原来的相对位置。
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

# 受控色板：暖黄 / 浅蓝 / 浅绿 / 中性灰，取自设计稿。
# 后端为权威定义，前端镜像同一组值，新增颜色必须两端同步。
STICKY_NOTE_COLOR_CHOICES: tuple[str, ...] = (
    "#FFF0D9",
    "#EAF3FF",
    "#EAF5EC",
    "#F3F0ED",
)

# 默认底色：暖黄。
DEFAULT_STICKY_NOTE_COLOR = STICKY_NOTE_COLOR_CHOICES[0]

# 模型 ``choices`` 需要「值 + 展示名」成对形式；底色本身即色值，
# 故展示名直接复用色值，避免展示文案与色板两处维护导致不一致。
STICKY_NOTE_COLOR_OPTIONS: tuple[tuple[str, str], ...] = tuple(
    (value, value) for value in STICKY_NOTE_COLOR_CHOICES
)

# 标题与内容都为空时 ``__str__`` 的兜底展示名。
STICKY_NOTE_UNTITLED = "未命名便签"


class StickyNote(models.Model):
    """用户私有的便签。

    ``position`` 由视图层在新建时追加到该用户末尾，重排接口按传入顺序整体重写；
    归档不改写 ``position``，恢复后仍处于原有相对位置。
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="sticky_notes",
        verbose_name="所属用户",
    )
    title = models.CharField(max_length=200, blank=True, default="", verbose_name="标题")
    content = models.TextField(blank=True, default="", verbose_name="内容")
    color = models.CharField(
        max_length=7,
        choices=STICKY_NOTE_COLOR_OPTIONS,
        default=DEFAULT_STICKY_NOTE_COLOR,
        verbose_name="底色",
    )
    is_pinned = models.BooleanField(default=False, verbose_name="是否置顶")
    is_archived = models.BooleanField(default=False, verbose_name="是否归档")
    position = models.PositiveIntegerField(verbose_name="排序位置")
    tags = models.ManyToManyField(
        "toolkit.Tag",
        blank=True,
        related_name="sticky_notes",
        verbose_name="标签",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        """模型元信息：列表查询固定按用户 + 归档状态 + 排序位置过滤。"""

        verbose_name = "便签"
        verbose_name_plural = "便签"
        # 列表接口的固定过滤条件为 (owner, is_archived)，再按 position 排序，
        # 组合索引可让「某用户未归档便签」的查询直接走索引。
        # 索引名上限 30 字符（Django 校验 E034），故用 sn/arch/pos 缩写。
        indexes = (
            models.Index(
                fields=("owner", "is_archived", "position"),
                name="toolkit_sn_owner_arch_pos_idx",
            ),
        )

    def __str__(self) -> str:
        """返回标题；标题为空时退化为内容摘要，便于在 admin 与日志中辨认。"""
        return self.title or self.content[:50] or STICKY_NOTE_UNTITLED
