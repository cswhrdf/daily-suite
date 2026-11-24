# daily-suite

一个基于前后端分离架构的家庭自用工具合集（Monorepo），首发功能包括便签、日历、待办与富文本笔记。

## 技术栈

| 层 | 技术 |
|---|---|
| 后端 | Python 3.12 · Django 6 · DRF · simplejwt · Celery · PostgreSQL 19 · Redis（uv 管理） |
| 前端 | Vue 3 · TypeScript · Vite · Vuetify · Pinia · Vue Router（pnpm workspace） |
| 部署 | Docker Compose（双编排）· nginx · Cloudflare Tunnel · Caddy（内网 DNS-01 证书） |
| 质量 | ruff · mypy · pytest（100% 覆盖）· deptry · eslint · stylelint · vue-tsc · vitest |

## 目录结构

```text
daily-suite/
├── apps/
│   ├── backend/              # Django 项目（uv 管理：pyproject.toml + uv.lock）
│   └── web/                  # 用户级前端（pnpm workspace 成员）
├── docker/                   # backend.Dockerfile / web.Dockerfile / caddy.Dockerfile / nginx.conf / Caddyfile
├── .github/                  # CI workflows（backend / frontend / report / security）
├── docker-compose.infra.yml  # 基础设施编排：postgres / redis / apiflow
├── docker-compose.yml        # 应用编排：backend / celery / nginx + caddy / cloudflared（profile 控制）
├── pnpm-workspace.yaml       # pnpm workspace 清单（apps/*）
├── package.json / pnpm-lock.yaml
├── AGENTS.md                 # AI 编码代理指引
├── CONTRIBUTING.md           # 贡献指南
└── README.md
```

## 快速开始

### 环境要求

- Python 3.12 + [uv](https://docs.astral.sh/uv/)
- Node ≥ 26 + [pnpm](https://pnpm.io/) 12
- Docker + Docker Compose

### 后端（本地开发）

```bash
cd apps/backend
uv sync --locked        # 安装依赖（锁文件 uv.lock）
uv run pytest           # 测试（自带 100% 覆盖门禁）
```

### 前端（本地开发）

```bash
pnpm install --frozen-lockfile   # 安装（锁文件在仓库根）
pnpm run dev                     # Vite dev server，/api 代理到 127.0.0.1:8000
```

### 容器运行

```bash
docker compose -f docker-compose.infra.yml -f docker-compose.yml up -d
# 公网隧道追加 --profile tunnel；内网证书追加 --profile tls
```

## 质量门禁

- 后端：`uv run ruff check .` / `uv run mypy` / `uv run pytest` / `uv run deptry .`
- 前端：`pnpm run lint` / `pnpm run lint:style` / `pnpm run typecheck` / `pnpm run test`

## 文档

- 贡献指南见 [CONTRIBUTING.md](CONTRIBUTING.md)
- AI 编码代理指引见 [AGENTS.md](AGENTS.md)
