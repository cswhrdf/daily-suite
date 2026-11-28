"""toolkit 应用的 Django 应用配置。"""

from django.apps import AppConfig


class ToolkitConfig(AppConfig):
    """daily-suite 业务应用的装载入口。

    业务模型、序列化器与视图均放在本应用内，按功能模块拆分文件。
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "toolkit"
