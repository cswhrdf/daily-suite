"""daily-suite 后端 Django 工程配置包。"""

# Django + Celery 官方约定：进程启动导入本包时就加载 Celery 应用，
# 保证 @shared_task 使用与 worker 相同的 app（否则会退化成默认 app）。
from .celery import app as celery_app

__all__ = ("celery_app",)
