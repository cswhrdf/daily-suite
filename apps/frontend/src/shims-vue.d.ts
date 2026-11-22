/**
 * 让非 vue-tsc 的类型检查器（如 typescript-eslint 的 projectService）也能解析 .vue 模块。
 * vue-tsc 会优先使用 SFC 自身的类型，这里只作为兜底声明。
 */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
