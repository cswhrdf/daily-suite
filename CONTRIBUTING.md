# 贡献指南

## 环境准备

- 后端：Python 3.12 + [uv](https://docs.astral.sh/uv/)。在 `apps/backend` 下 `uv sync --locked` 安装依赖（锁文件 `uv.lock`）。
- 前端：Node ≥ 26 + [pnpm](https://pnpm.io/) 12。在仓库根 `pnpm install --frozen-lockfile`（锁文件 `pnpm-lock.yaml` 在根）。
- 基础设施（可选）：Docker + Docker Compose，用于跑完整集成环境。

## 本地开发

后端（`apps/backend`）：

- `uv run ruff check .` — lint
- `uv run mypy` — 类型检查
- `uv run pytest` — 测试（自带 `--cov=config --cov-fail-under=100`，分支覆盖也计入）
- `uv run deptry .` — 依赖审计

前端（仓库根）：

- `pnpm run lint` / `pnpm run lint:style` / `pnpm run typecheck` / `pnpm run test`

## 代码风格

- 后端：ruff `select=["ALL"]`；docstring 与注释一律使用**中文 + 全角标点**（`D400`/`D415`/`RUF001-003` 等已豁免）。
- 前端：ESLint（flat config）+ Prettier + Stylelint；统一 `--max-warnings 0`。

## 测试与质量门禁

提交前请在本地跑通并保持全绿：

- 后端：ruff、mypy、pytest（覆盖率 100%，含分支）、deptry。
- 前端：eslint、stylelint、vue-tsc、vitest。

CI 会以相同门禁校验，任一项失败即阻断合并。

## 提交规范

- 提交信息用中文、简洁、动词开头，描述本次改动（例如「完成 XXX」「修复 XXX」）。
- 一个提交只做一件事，不要把无关改动混在一起。
- 密钥与本地环境文件（`.env`）不要提交（已在 `.gitignore` 中）。

## Pull Request 流程

1. 从 `dev` 拉出新分支（如 `feature/xxx`、`fix/xxx`）。
2. 本地跑完上述质量门禁。
3. 提交并推送，创建 PR；CI 全绿后再请求合并。

## 目录约定

- 后端业务代码在 `apps/backend/config/`（settings 拆为 `base`/`dev`/`prod`/`test`）。
- 前端代码在 `apps/web/src/`。
- 部署编排与镜像在 `docker/`、`docker-compose*.yml`。
