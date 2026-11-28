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

CI 会以相同门禁校验（见下节），任一项失败即阻断合并。

## CI/CD 流水线

配置都在 `.github/`。workflow 里的命令与本地脚本一一对应，改任一侧都要同步另一侧。

| Workflow | 触发 | 作用 |
| --- | --- | --- |
| `backend.yml`（Backend CI） | 改动 `apps/backend/**` 的推送（`main`）/PR，可手动 | `uv sync --locked --all-groups` → `ruff check` → `mypy`（strict）→ `pytest`（100% 覆盖率门禁，产出 Allure 结果）→ `pip-audit`（OSV，`--strict` 有洞即拦）→ `bandit`（medium 及以上）→ `deptry`（硬门禁）。附带 `postgres:19-alpine` service 容器 |
| `frontend.yml`（Frontend CI） | 改动 `apps/web/**`、锁文件、根 `package.json` 的推送（`main`）/PR，可手动 | 仓库根 `pnpm install --frozen-lockfile` → eslint → stylelint → vue-tsc → vitest（Allure 结果）→ Playwright E2E（仅当仓库变量 `ENABLE_E2E=true`）→ `pnpm audit --audit-level=high` |
| `report.yml`（Allure Report） | Backend CI / Frontend CI 运行结束后（`workflow_run`），可手动 | 下载前后端 `allure-results` → 合并到同一目录 → `allure generate`（Allure 3，Node 运行时，无需 Java）→ 上传 `allure-report` artifact（保留 30 天）。上游失败也出报告，被取消的运行不处理 |
| `security.yml`（Security Scan） | 推送 `main`、依赖或 `docker/**` 变更的 PR、每周一 03:00 UTC、手动 | Trivy `fs`（漏洞 + secret + IaC）与 `image`（镜像列表由 `base-images` job 从 Dockerfile 的 `FROM` 行派生）、gitleaks 扫完整 git 历史；命中即失败 |
| `dependency-review.yml` | PR → `main` | 只看本 PR 新引入/升级的依赖，`high` 及以上阻断；豁免写在 `.github/dependency-review-config.yml`。public 免费，私有仓库需 GitHub Code Security |
| `dependabot-auto-approve.yml` | `dependabot[bot]` 的 PR → `main` | 读兼容性评分：评分 ≥ 阈值且非 major 时自动 approve 并开启 squash auto-merge，其余保持人工审核 |
| `dependabot.yml` | 每周一 04:00（Asia/Shanghai） | 更新 uv（`/apps/backend`）、npm（`/`，覆盖 pnpm workspace）、github-actions（`/`）；minor + patch 分组，major 单独开 PR；typescript 的 major 暂忽略 |
| `renovate.json`（Renovate App） | 每周一 05:00 前（Asia/Shanghai） | 只启用 `dockerfile` manager：`docker:pinDigests` 把 `docker/backend.Dockerfile`、`docker/web.Dockerfile` 的 `FROM` 固定为 `tag@sha256:<digest>` 并持续更新 digest；不改 npm/pip/actions；PR 需人工评审（不会被 dependabot 自动审批命中） |

### 仓库侧需配置的 Secrets / Variables

位置：Settings → Secrets and variables → Actions。

| 名称 | 类型 | 必需 | 说明 |
| --- | --- | --- | --- |
| `DJANGO_SECRET_KEY` | Secret | 建议 | 未配置时回落到 `backend.yml` 里的 CI 专用占位值（保证 fork PR 也能跑）；不要复用真实环境密钥 |
| `CI_POSTGRES_PASSWORD` | Secret | 可选 | 未配置时用 CI 内部固定口令，该 PostgreSQL 只在 runner 本地网络 |
| `DEPENDABOT_PAT` | Secret | 可选 | 查询兼容性评分时优先使用，否则回退 `GITHUB_TOKEN` |
| `ENABLE_E2E` | Variable | 可选 | 设为 `true` 才执行 Playwright E2E；不设置则默认跳过 |
| `DEPENDABOT_AUTO_APPROVE_MIN_SCORE` | Variable | 可选 | 自动 approve 的兼容性评分阈值，默认 `90`，填非整数按 90 处理 |

`GITLEAKS_LICENSE` 仅当改用 `gitleaks/gitleaks-action` 时才需要；当前用社区版 CLI 镜像，无需配置。

`renovate.json` 由 Renovate App 读取，不需要仓库 Secret；需在 GitHub 上安装 Renovate App 并授权本仓库（见下方「基础镜像更新」）。

### 基础镜像更新（Renovate）

- `docker/backend.Dockerfile` 与 `docker/web.Dockerfile` 的 `FROM` 行必须保持字面量（不要用 `${VAR}` 拼 tag）；它们是 Trivy 镜像矩阵的唯一来源，`security.yml` 里的 `base-images` job 会自动解析。
- Renovate App 安装后按 `renovate.json` 运行：`docker:pinDigests` 首次会把 `FROM` 固定为 `tag@sha256:<digest>`，之后上游重建同一 tag 也会以「digest 更新」PR 的形式出现。
- Renovate PR 不被 `dependabot-auto-approve.yml` 处理（只匹配 `dependabot[bot]`），需要人工评审后合并。

首次接入步骤：

1. 打开 <https://github.com/apps/renovate>，Install 并授权 `cswhrdf/daily-suite`（public 仓库免费）。
2. 安装后 Renovate 直接读取仓库根 `renovate.json`；若仍出现 `Configure Renovate` onboarding PR（已有配置时通常不会），确认其内容与仓库配置一致后合并即可。
3. 首次运行会创建 `Dependency Dashboard` issue，勾选其中的 “Check this box to trigger a Renovate run” 可立即触发，无需等到周一。
4. 首次 PR 预期是 `chore(docker) Update python:3.12-slim-bookworm digest ...` 一类，只改 Dockerfile 的 `FROM`；合并后 `security.yml` 的 `base-images` 会自动把它带进 Trivy 扫描。

### 权限与仓库设置注意点

- workflow 默认 `permissions: contents: read`。Trivy 结果若要进 Security 标签页，需给 `security.yml` 加 `security-events: write` 并补 SARIF 上传步骤（私有仓库还需 GitHub Code Security）；当前只用退出码让流水线失败。
- 私有仓库未启用 GitHub Code Security 时 `dependency-review.yml` 会在 action 调用处失败，可删除该文件，由 Trivy、`pip-audit`、`pnpm audit` 承担同样的把关。
- 要让 Dependabot PR 跑完整流水线，需在 Settings → Actions → General 允许 Dependabot 访问 secrets；自动合并且要求仓库开启 auto-merge，并且分支保护允许 bot 的 approve 计入所需审核数。

### 本地能验证什么

- 能：YAML 语法（如 `python -c "import yaml; yaml.safe_load(open('.github/workflows/backend.yml'))"`），以及各门禁命令本地实跑。
- 能：基础镜像矩阵派生：`python3 .github/scripts/base_images.py`（列出镜像）与 `python3 -m unittest discover -s .github/scripts -p "test_*.py" -v`（解析逻辑单测）。
- 可选：Renovate 本地演练 `LOG_LEVEL=debug npx --yes renovate@latest --platform=local --dry-run=lookup`（需要访问 Docker Hub，只查不写）。
- 不能：GitHub Actions 的运行环境（service 容器、artifact、Secrets 语义），因此「CI 全绿」只能推送后由 GitHub 验证。

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
