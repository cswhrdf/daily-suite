import js from '@eslint/js'
import eslintConfigPrettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import vuejsAccessibility from 'eslint-plugin-vuejs-accessibility'
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
  // Vue 模板的静态可访问性检查：插件自带 flat config 预设
  // （flat/recommended 是一个数组，直接展开即可，files 已限定为 *.vue）。
  ...vuejsAccessibility.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: {
        parser: tseslint.parser,
      },
    },
  },
  {
    // 该配置块含类型感知规则（如 no-floating-promises），
    // 必须与带 projectService 的作用域一致，否则纯 JS 配置文件无法解析类型信息。
    files: typedFiles,
    plugins: {
      '@typescript-eslint': tseslint.plugin,
    },
    rules: {
      // 根组件沿用 Vue 官方约定名 App，属于模板豁免。
      'vue/multi-word-component-names': ['error', { ignores: ['App'] }],
      // Vue 模板 HTML 属性书写顺序：采用官方默认分组顺序，同组内按属性名字母序排序。
      'vue/attributes-order': ['error', { alphabetical: true }],

      // ==========================================
      // 1. Vue 3 核心架构与安全性严格规则
      // ==========================================

      // 强制全项目只允许使用 <script setup> 语法糖，禁止混用 Options API。
      'vue/component-api-style': ['error', ['script-setup']],

      // 强制编译器宏声明顺序：defineProps → defineEmits → defineSlots。
      'vue/define-macros-order': [
        'error',
        {
          order: ['defineProps', 'defineEmits', 'defineSlots'],
        },
      ],

      // 强制布尔属性简写，禁止冗余的 :disabled="true"。
      'vue/prefer-true-attribute-shorthand': 'error',

      // 完全禁用 v-html 指令，从源头杜绝 XSS。
      'vue/no-v-html': 'error',

      // 强制所有 Vue 组件的 <script> 必须显式声明 lang="ts"。
      // 注意：正确规则名是 vue/block-lang，不存在 vue/block-lang-argument。
      'vue/block-lang': ['error', { script: { lang: 'ts' } }],

      // ==========================================
      // 2. TypeScript 严格类型与异步逻辑规则
      // ==========================================

      // 严禁滥用 any，强制明确类型或使用 unknown。
      '@typescript-eslint/no-explicit-any': 'error',

      // 强制公共函数与导出方法显式声明返回值类型（箭头表达式豁免）。
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        {
          allowExpressions: true,
        },
      ],

      // 严禁悬空 Promise，异步调用必须被 await/then/catch 消费。
      '@typescript-eslint/no-floating-promises': 'error',

      // 禁止将 Promise 误传给不需要 Promise 的原生事件句柄。
      '@typescript-eslint/no-misused-promises': 'error',

      // ==========================================
      // 3. 生产环境通用质量规则
      // ==========================================

      // 强制使用 === / !==，禁止 == / != 的隐式转换。
      eqeqeq: ['error', 'always'],

      // 生产环境禁止 console.log，开发环境放行。
      'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',

      // 任何环境禁止 debugger。
      'no-debugger': 'error',
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
