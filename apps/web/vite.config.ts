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
    port: 5173,
    strictPort: true,
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
    // Allure 结果写入 apps/web/allure-results（相对 package 目录），
    // CI 中作为 artifact 上传，与 Playwright E2E 结果合并后由 report.yml 生成报告。
    // reporter 会自动注册 allure-vitest/setup，无需再配 setupFiles。
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
