"""测试环境配置（``DJANGO_SETTINGS_MODULE=config.settings.test``）。"""

from .base import *  # noqa: F403

# 测试环境同样关闭 DEBUG，避免错误页细节被断言依赖。
DEBUG = False

# 测试不关心哈希强度，用最快的 MD5 实现加速用例（生产仍用 base 的 Argon2）。
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# 本地测试默认直连本机 PostgreSQL（.env 里的 HOST 可能是容器服务名）；
# CI 通过 DATABASE_URL 指向 PG service 时，base 已按 DATABASE_URL 建库，此处不再覆盖。
if not env.str("DATABASE_URL", default=""):  # noqa: F405
    DATABASES["default"]["HOST"] = env.str(  # noqa: F405
        "POSTGRES_TEST_HOST",
        default="127.0.0.1",
    )
