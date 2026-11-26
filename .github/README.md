# CI / CD 配置说明（`.github/`）

本目录只放 CI 配置，不含业务代码。命令与本地脚本严格一一对应，改动任一侧都要同步另一侧。

## 文件清单

| 文件 | 作用 |
| --- | --- |
| `workflows/backend.yml` | 后端：`uv sync --locked --all-groups` → `ruff check` → `mypy` → `pytest`（100% 覆盖门禁）→ `pip-audit` → `bandit` → `deptry`（信息性） |
| `workflows/frontend.yml` | 前端（apps/web）：在 pnpm workspace 根执行 `pnpm install --frozen-lockfile` → `lint` → `lint:style` → `typecheck` → `test` → `pnpm audit`，Playwright 为占位步骤 |
| `workflows/report.yml` | 下载前后端 `allure-results` → 合并 → Allure 3（npm 包 `allure`）生成单一 HTML 报告并上传 artifact `allure-report` |
| `workflows/security.yml` | Trivy（fs + `python:3.12-slim-bookworm` / `nginx:1.30-alpine` 镜像）与 gitleaks（含历史提交） |
| `workflows/dependency-review.yml` | PR 级依赖变更审查，高危阻断（私有仓库需 GHAS） |
| `dependabot.yml` | uv（`/apps/backend`）、npm（`/`，pnpm workspace 根）、github-actions（`/`）周更 |

## 需要在 GitHub 仓库侧配置的内容

### Secrets（Settings → Secrets and variables → Actions）

| Secret | 是否必需 | 说明 |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | 建议配置 | 未配置时 `backend.yml` 回落到 CI 专用占位值，仅够跑测试；配好后走真实密钥 |
| `CI_POSTGRES_PASSWORD` | 可选 | 未配置时使用 CI 内部固定口令（PG 仅存在于 runner 本地网络） |
| `GITLEAKS_LICENSE` | 仅当改用 `gitleaks/gitleaks-action` 时 | 当前用社区版 CLI 镜像，不需要 |
| `CODECOV_TOKEN` | 可选 | 本项目暂未接 Codecov |

### Variables（Settings → Secrets and variables → Actions → Variables）

| Variable | 说明 |
| --- | --- |
| `ENABLE_E2E` | 设为 `true` 才执行 Playwright 步骤；接入 Playwright + allure-playwright 后打开 |

### Actions 权限

- 默认 `permissions: contents: read`。若要在 Dependabot PR 上跑完整流水线，需在
  Settings → Actions → General 允许 Dependabot 访问 secrets。
- 若仓库有 GHAS 且希望 Trivy 结果进入 Security 标签页，给 `security.yml` 加
  `security-events: write` 并补 SARIF 上传步骤。

## 本地可做 / 不可做的校验

- 可做：YAML 语法（`python -c "import yaml,sys; yaml.safe_load(...)"`）、命令与本地脚本一致性、
  各门禁命令本地实跑。
- 不可做：本地无法执行 GitHub Actions（runner、service 容器、artifact、Secrets 语义），
  因此“CI 全绿”只能在推送后由 GitHub 验证。

## 已知取舍

- `ruff format --check` 暂未进门禁：当前有 1 个文件未格式化，属业务代码改动范围。
- `deptry` 当前有 13 条 DEP002（`uvicorn`/`structlog` 等运行期依赖），先 `continue-on-error`。
- 前端覆盖率阈值未做硬门禁，待 `vite.config.ts` 的 `test.coverage.thresholds` 定稿后开启。
- Playwright E2E 未接入，`frontend.yml` 中由仓库变量 `ENABLE_E2E` 控制（默认跳过），启用步骤见该文件注释。
