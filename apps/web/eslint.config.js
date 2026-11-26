import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import { defineConfig } from 'eslint/config'
import globals from 'globals'
import tseslint from 'typescript-eslint'

// 类型感知规则集在 flat config 中没有 files 限定时会作用到所有文件，
// 因此统一收敛到 TS/TSX/Vue 源码范围。自带 files 的预设保持原样。
// 注意：typescript-eslint v8.73.0 中 strictTypeChecked 与 stylisticTypeChecked
// 预设本身未被标记 @deprecated，因此全部保留；真正弃用的是 tseslint.config()
// 辅助函数，官方推荐改用 ESLint 核心的 defineConfig()，故下方使用 defineConfig。
const typedFiles = ['**/*.{ts,tsx,vue}']

export default defineConfig(
  {
    // 生成物与第三方产物不参与 lint；schema.d.ts 由 openapi-typescript 生成。
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'src/api/schema.d.ts'],
  },
  js.configs.recommended,
  // defineConfig 支持 extends 展开；由 files 限定作用域，
  // 类型感知规则只对 TS/TSX/Vue 源文件生效（避免作用于 eslint.config.js 等纯 JS 文件）。
  {
    files: typedFiles,
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
  },
  {
    files: ['**/*.{ts,tsx,vue}'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
        extraFileExtensions: ['.vue'],
      },
    },
  },
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    rules: {
      // 根组件沿用 Vue 官方约定名 App，属于模板豁免。
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      // Vue 模板 HTML 属性书写顺序：显式启用，采用官方默认顺序。
      'vue/attributes-order': 'error',
    },
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },
  eslintConfigPrettier,
)
