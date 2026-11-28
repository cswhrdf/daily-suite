"""待办模型模块。

待办支持状态流转、优先级、截止时间、子任务与标签；本阶段先落地完整字段，
供便签转待办使用，列表/详情接口与一层子任务约束留待后续迭代补充。
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

# 状态取值与展示名：``pending`` 新建待办默认态，``done`` 表示已完成。
TODO_STATUS_CHOICES: tuple[tuple[str, str], ...] = (
    ("pending", "待处理"),
    ("in_progress", "进行中"),
    ("done", "已完成"),
)
TODO_STATUS_PENDING = "pending"
TODO_STATUS_DONE = "done"

# 优先级取值与展示名：新建待办默认中等优先级。
TODO_PRIORITY_CHOICES: tuple[tuple[str, str], ...] = (
    ("low", "低"),
    ("medium", "中"),
    ("high", "高"),
)
TODO_PRIORITY_MEDIUM = "medium"


class Todo(models.Model):
    """用户私有的待办。

    ``parent`` 用于一层子任务，层级约束由后续迭代在序列化器层落实；
    ``source_sticky_note`` 记录便签转待办的来源，来源便签被删除时置空而不级联删除。
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="todos",
        verbose_name="所属用户",
    )
    title = models.CharField(max_length=200, verbose_name="标题")
    description = models.TextField(blank=True, default="", verbose_name="描述")
    status = models.CharField(
        max_length=20,
        choices=TODO_STATUS_CHOICES,
        default=TODO_STATUS_PENDING,
        verbose_name="状态",
    )
    priority = models.CharField(
        max_length=20,
        choices=TODO_PRIORITY_CHOICES,
        default=TODO_PRIORITY_MEDIUM,
        verbose_name="优先级",
    )
    due_at = models.DateTimeField(null=True, blank=True, verbose_name="截止时间")
    position = models.PositiveIntegerField(verbose_name="排序位置")
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="subtasks",
        verbose_name="父任务",
    )
    source_sticky_note = models.ForeignKey(
        "toolkit.StickyNote",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="converted_todos",
        verbose_name="来源便签",
    )
    completed_at = models.DateTimeField(null=True, blank=True, verbose_name="完成时间")
    tags = models.ManyToManyField(
        "toolkit.Tag",
        blank=True,
        related_name="todos",
        verbose_name="标签",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        """模型元信息：状态列表与截止时间提醒都按用户聚合查询。"""

        verbose_name = "待办"
        verbose_name_plural = "待办"
        # 索引名上限 30 字符（Django 校验 E034），故 status 缩写为 st。
        indexes = (
            # 按状态分组、组内按手工位置排序的列表查询。
            models.Index(
                fields=("owner", "status", "position"),
                name="toolkit_todo_owner_st_pos_idx",
            ),
            # 截止时间提醒按用户给出即将到期与已逾期的待办。
            models.Index(fields=("owner", "due_at"), name="toolkit_todo_owner_due_idx"),
        )

    def __str__(self) -> str:
        """返回待办标题。"""
        return self.title
