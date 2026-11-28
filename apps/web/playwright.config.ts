import { defineConfig } from '@playwright/test'

// E2E 与开发服务器共用 5400 端口（与 vite.config.ts 的 server.port、.vscode/launch.json 一致）。
const PORT = '5400'
const BASE_URL = `http://127.0.0.1:${PORT}`

const isCI = process.env['CI'] === 'true'

/**
 * Playwright E2E 配置。
 *
 * - 结果写入 `allure-results`（与 vitest 的 resultsDir 相同），CI 中作为单个
 *   artifact 上传，由 report.yml 与后端结果合并生成 Allure 报告。
 * - `webServer` 自行拉起 mock 开发环境（`pnpm dev:mock`：Prism mock 跑在 4010，
 *   Vite 以 `--mode mock` 把 `/api` 代理到 4010），用例不依赖真实后端。
 * - Prism 对 `/api/auth/refresh/` 只定义了 200 AccessToken 响应，守卫因此判定会话已恢复，
 *   访问 `/login` 会被重定向到首页，用例按此已登录初态断言。
 * - 本地复用已启动的 dev server，CI 中每次都全新启动。
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  reporter: [['list'], ['allure-playwright', { outputFolder: 'allure-results' }]],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: {
    command: 'pnpm dev:mock',
    url: BASE_URL,
    reuseExistingServer: !isCI,
    timeout: 120_000,
  },
})
