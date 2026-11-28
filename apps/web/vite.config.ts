/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

// 联调真实后端：pnpm dev（默认 target http://127.0.0.1:8000）
// 联调 Prism mock：pnpm run dev:mock（--mode mock，target http://127.0.0.1:4010）
// 也可用 VITE_API_PROXY_TARGET 显式覆盖 target。
export default defineConfig(({ mode }) => ({
  plugins: [
    vue(),
    vuetify({
      autoImport: true,
      // 测试环境由 Vitest 处理 CSS，关闭 Vuetify 的 sass 虚拟模块，
      // 否则 virtual:plugin-vuetify:* 在 Node 侧无法解析。
      styles: mode === 'test' ? 'none' : { configFile: 'src/styles/settings.scss' },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // 端口用 5400：Windows 侧 Hyper-V/WinNAT 存在端口保留区间（excludedportrange），
    // 实测覆盖 5000-53xx，导致 WSL2 无法把 5173 转发到 Windows localhost。
    port: 5400,
    strictPort: true,
    // 监听 IPv4 全网卡：WSL2 会把 0.0.0.0 转发到 Windows localhost，
    // 且 localhost 与 127.0.0.1 两路可达。
    host: '0.0.0.0',
    // 开发期同源代理：浏览器只访问 Vite dev server，后端不需要 CORS。
    proxy: {
      '/api': {
        target:
          process.env['VITE_API_PROXY_TARGET'] ??
          (mode === 'mock' ? 'http://127.0.0.1:4010' : 'http://127.0.0.1:8000'),
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['tests/setup.ts'],
    // Allure 结果写入 apps/web/allure-results（相对 package 目录），
    // CI 中作为 artifact 上传，与 Playwright E2E 结果合并后由 report.yml 生成报告。
    // reporter 自动注册 Allure setup；此处仅显式注册应用测试插件。
    reporters: ['default', ['allure-vitest/reporter', { resultsDir: 'allure-results' }]],
    // Vuetify 的组件入口直接 import .css，需交给 Vite 转换而不是 Node 直接加载。
    server: {
      deps: {
        inline: ['vuetify'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,vue}'],
      exclude: ['src/api/schema.d.ts', 'src/main.ts'],
    },
  },
}))
