# AGENTS.md

面向 AI 编码代理的仓库级指引。本仓库是家庭自用工具合集「daily-suite」的前后端分离 Monorepo。

## 项目概览

- `apps/backend/`：Django 6.0 + DRF + simplejwt + Celery + PostgreSQL + Redis，由 **uv** 管理（`pyproject.toml` + `uv.lock`）。
- `apps/web/`：Vue 3 + TypeScript + Vite + Vuetify + Pinia + Vue Router，由 **pnpm workspace** 管理（锁文件在仓库根）。
- 部署：Docker Compose 双编排 —— `docker-compose.infra.yml`（postgres/redis/apiflow，创建 `home-toolkit-net`）与 `docker-compose.yml`（migrate/backend/celery-worker/celery-beat/nginx + caddy/cloudflared 两个 profile 服务）。两份 compose 当前仅作本地开发配置，实际部署用另一套配置。

## 常用命令

后端（`apps/backend`，用 uv；从仓库根可用 `uv --directory apps/backend run ...`）：

- 安装：`uv sync --locked`
- lint：`uv run ruff check .`
- 类型：`uv run mypy`
- 测试：`uv run pytest`（自带 `--cov=config --cov-fail-under=100`，分支覆盖也计入）
- 依赖审计：`uv run deptry .`

前端（仓库根，pnpm）：

- 安装：`pnpm install --frozen-lockfile`
- 检查：`pnpm run lint` / `pnpm run lint:style` / `pnpm run typecheck` / `pnpm run test`
- 构建：`pnpm run build`

容器（合并两个 compose 文件）：

- `docker compose -f docker-compose.infra.yml -f docker-compose.yml up -d`
- 公网隧道：追加 `--profile tunnel`；内网证书：追加 `--profile tls`

## 关键架构约定（改动时必须遵守）

- **配置**：settings 拆为 `config/settings/{base,dev,prod,test}.py`，用 `DJANGO_SETTINGS_MODULE` 切换；必需配置用 `os.environ[...]` 读取，缺失即崩，不写默认值兜底。
- **认证**：Access Token 只放前端内存；Refresh Token 走 `httpOnly + Secure + SameSite=Lax` Cookie（配置在 `SIMPLE_JWT` 的自定义键，由 `config/auth_cookies.py` 读取）。登录/刷新/登出视图刻意 `authentication_classes = ()`，靠 Cookie 工作，别给它们加 JWT 认证类。
- **跨域**：生产 nginx 同源（`/` 出 dist、`/api/` 反代 backend），不引入 `django-cors-headers`；开发用 Vite proxy。
- **数据库**：开发与生产统一 PostgreSQL（`postgres:19-alpine` + `pg_trgm`），SQLite 仅临时脚本。
- **富文本图片**：本地 `MEDIA_ROOT` 卷 + nginx `X-Accel-Redirect`（`/protected-media/` 内联 alias）。
- **HTTPS**：`SECURE_SSL_REDIRECT=true`（当前）；HSTS 默认关子域覆盖/preload（`SECURE_HSTS_INCLUDE_SUBDOMAINS`/`PRELOAD` env 可控）。公网走 Cloudflare Tunnel（cloudflared），内网走 Caddy DNS-01（自建镜像），两层都反代 `nginx:80`。
- **admin 静态**：DEBUG 下由 Django 托管，不引入 collectstatic/whitenoise（后台后续重写）。

## 质量门禁（改动必须全绿）

- ruff `select=["ALL"]`，因中文 docstring 用全角句号，`D400`/`D415`/`RUF001-003` 等已豁免——**新增 docstring/注释也用中文 + 全角标点**，别引入 ASCII 风格破坏一致性。
- mypy `strict=true` + `mypy_django_plugin`/`mypy_drf_plugin`，`files=["config","tests"]`。
- pytest 覆盖率 `fail_under=100`、`branch=true`；脚手架文件（manage/asgi/wsgi/celery/settings）在 `omit` 里。
- deptry 的 `per_rule_ignores` 已登记「命令行调用、settings 字符串路径、预留依赖、测试专用」等间接依赖；新增依赖被 DEP002 误报时按同样方式登记并注明理由，别直接删依赖。
- 前端 eslint/stylelint/vue-tsc/vitest 一律 `--max-warnings 0`。

## 易踩的坑

- **Caddy 官方镜像不含 `dns.providers.cloudflare`**，必须用 `docker/caddy.Dockerfile`（xcaddy `--with caddy-dns/cloudflare`）自建，别改回官方镜像。
- **重建 backend 后 nginx 会 502**：nginx upstream 用启动时解析的静态 IP，`docker compose ... restart nginx` 一次即可。
- **开启 `SECURE_SSL_REDIRECT` 后探活会被 301**：backend/nginx 健康检查必须带 `X-Forwarded-Proto: https` 头；nginx `geo` 已信任 `127.0.0.1/32`。改探活时别丢掉这个头。
- **postgres 18+ 的 PGDATA 在 `/var/lib/postgresql/<major>/docker`**，命名卷要挂父目录 `/var/lib/postgresql`，否则数据写进匿名卷。
- **Django 6.0 + django-celery-beat 2.9 是刻意降级**（beat 2.1.0 与 Celery 5.7 zoneinfo 不兼容）。升级 Django 6.1 前先看 `apps/backend/pyproject.toml` 顶部 TODO 与 celery 仓库 issue #1079。
- **登录端点必须带尾斜杠** `/api/auth/login/`，不带会 301，浏览器把 POST 降级成 GET 得到 405。
- **pnpm 需在 PATH**（本机 WSL 若未装，参考 `.vscode/tasks.json` 里的绝对路径）；安装必须 `--frozen-lockfile`。

## 计划文档约束

项目里 `PLAN*.md` 仅用于计划与进度追踪，**不是代码/配置/构建的事实来源**。任何源代码、配置、Dockerfile、CI、注释、日志都不得引用计划文档的内容（如「阶段 N」「PLAN」字样）。正式约定写进源码、配置或本文件，不能只存在于计划文档里。

## 关键文件

- 后端配置：`apps/backend/config/settings/*.py`；认证：`apps/backend/config/auth_views.py`、`auth_cookies.py`、`auth_serializers.py`；路由：`apps/backend/config/urls.py`
- 前端：`apps/web/src/`（`api/http.ts`、`stores/auth.ts`、`router/guard.ts`、`views/LoginView.vue`）；`apps/web/vite.config.ts`
- 部署：`docker-compose.yml`、`docker-compose.infra.yml`、`docker/{nginx.conf, Caddyfile, caddy.Dockerfile, backend.Dockerfile, web.Dockerfile}`
