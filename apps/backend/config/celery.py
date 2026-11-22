"""Celery 应用装配入口。

不使用 ``config_from_object`` 读取独立的 Celery 配置文件，而是绑定 Django settings：
``namespace="CELERY"`` 会把 settings 里的 ``CELERY_*`` 配置去掉前缀后映射为 Celery 配置项，
使 Celery / Django 两边的配置只有一份来源。
"""

import os

from celery import Celery

# 容器内由 compose 注入 DJANGO_SETTINGS_MODULE；本机直接跑 celery 命令时
# 默认按生产配置装配（可用环境变量覆盖），与 asgi.py / wsgi.py 的约定一致。
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.prod")

app = Celery("config")
app.config_from_object("django.conf:settings", namespace="CELERY")
# 自动发现各 Django app 下的 tasks.py；当前尚无任务模块，后续新增任务无需改本文件。
app.autodiscover_tasks()
