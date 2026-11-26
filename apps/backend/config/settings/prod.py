"""生产环境配置（``DJANGO_SETTINGS_MODULE=config.settings.prod``）。

生产下强制关闭 DEBUG，并显式打开 HTTPS/HSTS/Cookie 等安全项，
以便 ``manage.py check --deploy`` 不再报 W004/W008/W012/W016。
"""

from .base import *  # noqa: F403

# 生产必须关闭调试。
DEBUG = False

# 全站强制 HTTPS（反向代理终止 TLS 时由 X-Forwarded-Proto 判定）。
SECURE_SSL_REDIRECT = env.bool("DJANGO_SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Session / CSRF Cookie 仅通过 HTTPS 传输。
SESSION_COOKIE_SECURE = env.bool(  # noqa: F405
    "DJANGO_SESSION_COOKIE_SECURE",
    default=True,
)
CSRF_COOKIE_SECURE = env.bool("DJANGO_CSRF_COOKIE_SECURE", default=True)  # noqa: F405

# HSTS：默认一年；子域覆盖与 preload 默认关闭（家庭场景按需开启）。
# 内网名/IP 场景建议设 0：HTTP 直连的局域网设备不应被浏览器记住强制 HTTPS。
SECURE_HSTS_SECONDS = env.int(  # noqa: F405
    "DJANGO_SECURE_HSTS_SECONDS",
    default=31536000,
)
# 家庭场景常有打印机 / NAS 面板等子域仅走 http，默认不覆盖子域。
SECURE_HSTS_INCLUDE_SUBDOMAINS = env.bool(  # noqa: F405
    "DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS",
    default=False,
)
# preload 需公网可解析并提交 hstspreload.org，家庭域名零收益，默认关闭。
# 内网名/IP 场景建议设 0（同 SECURE_HSTS_SECONDS）。
SECURE_HSTS_PRELOAD = env.bool(  # noqa: F405
    "DJANGO_SECURE_HSTS_PRELOAD",
    default=False,
)

# 家庭场景刻意关闭 HSTS 子域覆盖与 preload（存在打印机/NAS 面板等 http 子域，
# preload 对家庭域名零收益），因此 security.W005 / security.W021 属已知且接受的风险，
# 显式沉默这两条检查，避免 check --deploy 的噪音。
SILENCED_SYSTEM_CHECKS = ["security.W005", "security.W021"]
