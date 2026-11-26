## 变更说明

<!-- 一句话说明这次改动做了什么、为什么需要它 -->

## 关联 Issue

<!-- 例：Closes #123；没有可写「无」 -->

Closes #

## 变更类型

- [ ] 新功能（feature）
- [ ] 缺陷修复（fix）
- [ ] 重构（refactor，无行为变化）
- [ ] 性能优化（perf）
- [ ] 文档（docs）
- [ ] 构建 / 依赖 / CI（build、ci、deps）
- [ ] 测试（test）

## 影响范围

- [ ] 后端（`apps/backend/`：settings、认证、视图、Celery）
- [ ] 前端（`apps/web/src/`：路由、状态、视图、API 封装）
- [ ] 数据库（模型、迁移、索引）
- [ ] 部署（`docker/`、`docker-compose*.yml`、nginx、Caddy）
- [ ] CI 与工具链（`.github/`、`package.json`、`pyproject.toml`）

## 改动清单

<!-- 按模块列出关键改动，便于审查 -->

-

## 本地自查（提交前请全绿）

后端（`apps/backend`）：

- [ ] `uv run ruff check .`
- [ ] `uv run mypy`
- [ ] `uv run pytest`（覆盖率 100%，含分支）
- [ ] `uv run deptry .`

前端（仓库根）：

- [ ] `pnpm run lint`
- [ ] `pnpm run lint:style`
- [ ] `pnpm run typecheck`
- [ ] `pnpm run test`

> 只涉及单侧时可勾掉另一侧，并在「补充说明」中写明原因。

## 配置与部署影响

- [ ] 新增或修改环境变量（已同步 `.env.example`，以及相关 settings / compose）
- [ ] 新增数据库迁移
- [ ] 新增依赖（`uv.lock` / `pnpm-lock.yaml` 已更新）
- [ ] 需要重建镜像或重启服务（如 nginx 需 `restart` 以刷新 upstream）
- [ ] 影响 `SECURE_SSL_REDIRECT` / 健康检查（探活需带 `X-Forwarded-Proto: https`）
- [ ] 不涉及以上内容

## 破坏性变更

<!-- 接口签名、Token 与 Cookie 策略、数据库字段、配置键等；无则写「无」 -->

无

## 验证证据

<!-- 测试输出摘要、覆盖率数字、Allure artifact 名称或报告链接、接口响应示例 -->

## 截图 / 录屏（UI 改动必填）

| 改动前 | 改动后 |
| --- | --- |
|  |  |

## 审查者关注点

<!-- 希望重点审查的部分、已知取舍、遗留问题与后续计划 -->

## 补充说明

<!-- 其他需要说明的内容，例如跳过的门禁及原因 -->
