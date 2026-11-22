"""本地开发环境配置（``DJANGO_SETTINGS_MODULE=config.settings.dev``）。"""

from .base import *  # noqa: F403

# 本地默认开启调试；.env 里显式设置 DJANGO_DEBUG 时以其为准。
DEBUG = env.bool("DJANGO_DEBUG", default=True)  # noqa: F405

# 本地开发默认放行 localhost/127.0.0.1（.env 提供该变量时以 .env 为准）。
ALLOWED_HOSTS = env.list(  # noqa: F405
    "DJANGO_ALLOWED_HOSTS",
    default="localhost,127.0.0.1",
)
