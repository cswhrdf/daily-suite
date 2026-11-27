"""所有环境共用的 Django 配置。

本模块只放与环境无关的公共配置；``DEBUG``、生产安全项、测试专用项等
环境差异都由 ``dev.py`` / ``prod.py`` / ``test.py`` 负责。
"""

from datetime import timedelta
from pathlib import Path

import environ
from django.utils.csp import CSP

# apps/backend/config/settings/base.py -> BASE_DIR = apps/backend
BASE_DIR = Path(__file__).resolve().parent.parent.parent
# 仓库根目录（存放 .env）。容器内由 compose env_file 直接注入环境变量，
# 本地开发则从仓库根 .env 读取；已存在的环境变量优先（read_env 不覆盖）。
REPO_ROOT = BASE_DIR.parent.parent
ENV_FILE = REPO_ROOT / ".env"

env = environ.Env()

if ENV_FILE.is_file():
    env.read_env(str(ENV_FILE), overwrite=False)

# 必需配置不写默认值：缺失即抛 ImproperlyConfigured，避免带着错误配置启动。
# 注：DEBUG 属于环境差异项，不在此定义。
SECRET_KEY = env("DJANGO_SECRET_KEY")
ALLOWED_HOSTS = env.list("DJANGO_ALLOWED_HOSTS")
CSRF_TRUSTED_ORIGINS = env.list("DJANGO_CSRF_TRUSTED_ORIGINS")


# Application definition

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # 第三方
    "rest_framework",
    # 刷新令牌黑名单：登出、刷新轮换后旧令牌立即失效
    "rest_framework_simplejwt.token_blacklist",
    "django_filters",
    "drf_spectacular",
    # Celery 相关：beat 的周期任务与 worker 的任务结果都需要持久化到数据库，
    # 前者由 django-celery-beat 提供 admin 可编辑的调度表，后者由 results 后端建表。
    "django_celery_beat",
    "django_celery_results",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    # Django 6 内置 CSP 中间件
    "django.middleware.csp.ContentSecurityPolicyMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    # 按 Accept-Language 激活语言；必须位于 Session 之后、Common 之前。
    "django.middleware.locale.LocaleMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

# Django 6 内置 CSP：默认只允许同源资源。
SECURE_CSP = {
    "default-src": [CSP.SELF],
    "script-src": [CSP.SELF],
    "style-src": [CSP.SELF],
    "img-src": [CSP.SELF, "data:"],
    "connect-src": [CSP.SELF],
    "font-src": [CSP.SELF],
    "frame-ancestors": [CSP.NONE],
    "base-uri": [CSP.SELF],
    "form-action": [CSP.SELF],
}
SECURE_CSP_REPORT_ONLY: dict[str, list[str]] = {}

ROOT_URLCONF = "config.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "config.wsgi.application"


# Database
# https://docs.djangoproject.com/en/6.0/ref/settings/#databases

# 开发与生产统一使用 PostgreSQL；优先 DATABASE_URL，否则用 POSTGRES_* 拼装。
# 凭据类变量同样不写默认值，缺失即报错。
if env.str("DATABASE_URL", default=""):
    DATABASES = {"default": env.db()}
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.postgresql",
            "NAME": env("POSTGRES_DB"),
            "USER": env("POSTGRES_USER"),
            "PASSWORD": env("POSTGRES_PASSWORD"),
            "HOST": env("POSTGRES_HOST"),
            "PORT": env("POSTGRES_PORT"),
            "CONN_MAX_AGE": 60,
        },
    }


# Password validation
# https://docs.djangoproject.com/en/6.0/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

# 首选 Argon2，其余保留以便轮换旧哈希。
PASSWORD_HASHERS = [
    "django.contrib.auth.hashers.Argon2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2PasswordHasher",
    "django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher",
    "django.contrib.auth.hashers.ScryptPasswordHasher",
]


# Internationalization
# https://docs.djangoproject.com/en/6.0/topics/i18n/

# 默认语言为简体中文；其余语言由 LocaleMiddleware 依 Accept-Language 激活。
LANGUAGE_CODE = "zh-hans"

# 允许激活的语言（与 gettext 的 locale 标识一致）。
LANGUAGES = [
    ("zh-hans", "简体中文"),
    ("en", "English"),
]

# 翻译文件目录：当前仅预留位置，尚未运行 makemessages 生成 .po/.mo，
# 因此所有语言暂时都直接返回中文 msgid。
LOCALE_PATHS = [BASE_DIR / "locale"]

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True


# Static files (CSS, JavaScript, Images)
# https://docs.djangoproject.com/en/6.0/howto/static-files/

STATIC_URL = "static/"


# Email
# https://docs.djangoproject.com/en/6.0/topics/email/#topic-email-configuration

# 邮件暂不做：沿用传统 EMAIL_BACKEND（Django 6.1 引入的 MAILERS 新式配置暂不采用，
# 待升回 Django 6.1 + django-celery-beat 2.10 时再一并迁移）。
# 默认 SMTP 后端（生产就绪）；本地需要打印邮件时可在 .env 里设置
# DJANGO_EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend。
EMAIL_BACKEND = env(
    "DJANGO_EMAIL_BACKEND",
    default="django.core.mail.backends.smtp.EmailBackend",
)


# ---------- Celery / Redis ----------
# REDIS_URL 是容器内 redis 服务的完整连接串（含密码），属于凭据类配置，
# 与 POSTGRES_* 一样不提供默认值：缺失即抛 ImproperlyConfigured。
REDIS_URL = env.str("REDIS_URL")
# Broker 允许单独覆盖（例如临时指向独立实例），未设置时复用 REDIS_URL。
CELERY_BROKER_URL = env.str("CELERY_BROKER_URL", default=REDIS_URL)

# 任务结果写 PostgreSQL（依赖 django_celery_results 建表），便于在 admin 里按任务 ID
# 排查；备选方案是复用 Redis（CELERY_RESULT_BACKEND = CELERY_BROKER_URL），
# 但会与 Broker/缓存共用同一实例的键空间，清理与排障都更麻烦，故不采用。
CELERY_RESULT_BACKEND = "django-db"
CELERY_RESULT_EXTENDED = True
CELERY_RESULT_EXPIRES = int(timedelta(days=7).total_seconds())

# beat 调度持久化在数据库（admin 可增删改），而非本地 celerybeat-schedule 文件；
# 这样 beat 容器重建后周期任务不会丢失，多副本也不会各读一份文件。
CELERY_BEAT_SCHEDULER = "django_celery_beat.schedulers:DatabaseScheduler"
CELERY_TIMEZONE = TIME_ZONE
CELERY_ENABLE_UTC = True

# worker 启动时若 Broker 尚未就绪则持续重试，避免与 infra 编排的启动顺序耦合。
CELERY_BROKER_CONNECTION_RETRY_ON_STARTUP = True
# 记录任务开始状态，便于在结果表中区分「排队中」与「执行中」。
CELERY_TASK_TRACK_STARTED = True
# 单任务硬超时，防止异常任务长期占用 worker。
CELERY_TASK_TIME_LIMIT = 10 * 60


# ---------- Cache ----------
# 默认缓存使用 django-redis，连接串与 Broker 同源（本项目 Redis 即缓存/队列共用实例）。
# Redis 不可用时缓存读写会直接报错而非静默降级，符合「配置错误要暴露」的原则。
CACHES = {
    "default": {
        "BACKEND": "django_redis.cache.RedisCache",
        "LOCATION": CELERY_BROKER_URL,
        "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient"},
        # 多环境共用同一 Redis 时隔离键空间，避免 dev/prod 缓存互相覆盖。
        "KEY_PREFIX": "daily-suite",
    },
}


# ---------- Django REST Framework ----------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [
        # 前端 / 移动端走 JWT；SessionAuthentication 保留给 admin 与本地调试。
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": [
        "rest_framework.permissions.IsAuthenticated",
    ],
    "DEFAULT_FILTER_BACKENDS": [
        "django_filters.rest_framework.DjangoFilterBackend",
    ],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}


# ---------- SimpleJWT ----------
# Access Token 有效期较短，只由前端保存在内存；Refresh Token 生命周期较长，
# 仅通过 httpOnly Cookie 在浏览器与后端之间往返。
ACCESS_TOKEN_LIFETIME = timedelta(minutes=15)
REFRESH_TOKEN_LIFETIME = timedelta(days=14)

SIMPLE_JWT = {
    "ACCESS_TOKEN_LIFETIME": ACCESS_TOKEN_LIFETIME,
    "REFRESH_TOKEN_LIFETIME": REFRESH_TOKEN_LIFETIME,
    # 每次刷新都轮换 Refresh Token，并把旧令牌加入黑名单，降低被重放的风险。
    "ROTATE_REFRESH_TOKENS": True,
    "BLACKLIST_AFTER_ROTATION": True,
    # 登录时不在用户表上写 last_login（由业务层决定是否需要）。
    "UPDATE_LAST_LOGIN": False,
    "AUTH_HEADER_TYPES": ("Bearer",),
    # ---------- Refresh Token Cookie ----------
    # 以下非 simplejwt 内置语义的键由 config.auth_cookies 读取，
    # 集中在此以免 Cookie 名称/属性散落在视图代码里。
    "AUTH_COOKIE": "daily_suite_refresh",
    # 只在认证端点路径上携带，避免每个 /api 请求都带 Refresh Cookie。
    "AUTH_COOKIE_PATH": "/api/auth",
    "AUTH_COOKIE_DOMAIN": None,
    # 生产必须为 True；本地 http 联调在 dev.py 中按 DEBUG 关闭。
    "AUTH_COOKIE_SECURE": True,
    "AUTH_COOKIE_HTTP_ONLY": True,
    "AUTH_COOKIE_SAMESITE": "Lax",
    "AUTH_COOKIE_MAX_AGE": int(REFRESH_TOKEN_LIFETIME.total_seconds()),
}


# ---------- drf-spectacular ----------
SPECTACULAR_SETTINGS = {
    "TITLE": "Daily Suite API",
    "DESCRIPTION": "Daily Suite 后端 API 规范。",
    "VERSION": "0.1.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "SCHEMA_PATH_PREFIX": "/api",
}
