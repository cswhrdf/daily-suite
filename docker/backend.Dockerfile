# syntax=docker/dockerfile:1
# =============================================================================
# daily-suite 后端运行镜像（Django + DRF + Celery）
#
# 设计策略：
#   - 多阶段构建：builder 用 uv 按 uv.lock 把依赖装进独立 venv；runtime 只拷 venv
#     与源码，不带 uv、编译器与构建缓存，镜像更小、攻击面更少。
#   - 依赖一致性：全程 `uv sync --locked`，pyproject 与 uv.lock 不一致时构建直接失败，
#     避免镜像里的依赖与本地/CI 漂移。
#   - 非 root：runtime 以 uid/gid 10001 的 app 用户运行，应用进程不允许 root 启动。
#   - 健康检查：用镜像自带的 python 探针请求 /healthz，无需额外安装 curl/wget。
#   - digest：基础镜像当前固定到具体发行版 tag（slim-bookworm），兼顾可读性与可复现；
#     TODO(上线前)：`docker pull` 后把 tag 换成 `tag@sha256:<digest>` 彻底锁定。
# =============================================================================

ARG PYTHON_VERSION=3.12

# ---------- Stage 1：builder ----------
FROM python:${PYTHON_VERSION}-slim-bookworm AS builder

# uv 官方静态镜像里的二进制（版本与仓库本地 uv 对齐），避免构建期再经 pip 下载 uv。
COPY --from=ghcr.io/astral-sh/uv:0.13.7 /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    UV_PROJECT_ENVIRONMENT=/opt/venv

WORKDIR /app

# 先只拷依赖清单：源码变更不会让依赖安装层失效，最大化构建缓存命中。
COPY apps/backend/pyproject.toml apps/backend/uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

COPY apps/backend/ ./
# 第二遍 sync 让项目本身（本仓库为虚拟项目）与源码就位，同时校验锁文件未漂移。
RUN uv sync --locked --no-dev

# ---------- Stage 2：runtime ----------
FROM python:${PYTHON_VERSION}-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:${PATH}" \
    DJANGO_SETTINGS_MODULE=config.settings.prod

# 固定 uid/gid，便于宿主机卷权限排查；nologin shell 降低被交互利用的可能。
RUN groupadd --gid 10001 app \
    && useradd --uid 10001 --gid app --create-home --shell /usr/sbin/nologin app

WORKDIR /app

# venv 与源码都以 app 用户属主拷贝，运行期无需再 chown。
COPY --from=builder --chown=app:app /opt/venv /opt/venv
COPY --chown=app:app apps/backend/ /app/

# MEDIA_ROOT / STATIC_ROOT：nginx 通过 X-Accel-Redirect 读 /srv/media，
# 目录提前建好并授权，避免容器首次运行因权限失败。
RUN mkdir -p /srv/media /app/staticfiles \
    && chown -R app:app /srv/media /app/staticfiles

USER app

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
    CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8000/healthz', timeout=3).status == 200 else 1)"]

# 默认以 gunicorn + uvicorn worker 跑 ASGI；celery worker/beat 复用同一镜像，
# 由编排层用不同 command 覆盖（see docker-compose.yml）。
# 注：uvicorn 已标记 uvicorn.workers 模块为过时接口，升级 uvicorn 大版本时
# 需改用 uvicorn-worker 包或直接以 `uvicorn --workers N` 启动。
CMD ["gunicorn", "config.asgi:application", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "3", \
     "--timeout", "60", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
