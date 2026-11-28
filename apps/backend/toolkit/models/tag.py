"""全局标签模型模块。

标签归属于单个用户，同一用户内名称唯一，跨用户允许重名；
颜色取自受控色板，取值由后端统一定义。
"""

from __future__ import annotations

from django.conf import settings
from django.db import models

# 受控色板：后端为权威定义，前端镜像同一组值，新增颜色必须两端同步。
TAG_COLOR_CHOICES: tuple[str, ...] = (
    "#C2410C",
    "#1867C0",
    "#217A46",
    "#8A5A00",
    "#BA1A1A",
    "#5E35B1",
    "#00838F",
    "#546E7A",
)


class Tag(models.Model):
    """用户私有的全局标签。

    手写 ``__str__`` 以便在 admin、日志与调试输出中直接看到标签名称。
    """

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="tags",
        verbose_name="所属用户",
    )
    name = models.CharField(max_length=50, verbose_name="名称")
    color = models.CharField(max_length=7, verbose_name="颜色")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="创建时间")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="更新时间")

    class Meta:
        """模型元信息：同一用户名下标签不重名，并为归属字段建索引。"""

        verbose_name = "标签"
        verbose_name_plural = "标签"
        # 名字唯一性按用户隔离：不同用户可以各自拥有同名标签。
        unique_together = (("owner", "name"),)
        indexes = (models.Index(fields=("owner",), name="toolkit_tag_owner_idx"),)

    def __str__(self) -> str:
        """返回标签名称。"""
        return self.name
