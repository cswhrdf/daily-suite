import type { NavigationGuard } from 'vue-router'

import { useAuthStore } from '@/stores/auth'

// 为路由 meta 声明强类型字段：开启 noPropertyAccessFromIndexSignature 后，
// 只有显式声明过的属性才能用点号访问。
declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
  }
}

/**
 * 全局路由守卫。
 *
 * - 受保护路由：无 Access Token 时先尝试用 Refresh Cookie 恢复会话，
 *   仍失败则跳转 `/login` 并记录原始地址；
 * - 已登录时访问 `/login`：直接回首页，避免重复登录。
 */
export const authGuard: NavigationGuard = async (to) => {
  const auth = useAuthStore()
  await auth.ensureSession()

  if (to.meta.requiresAuth === true && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.name === 'login' && auth.isAuthenticated) {
    return { name: 'home' }
  }

  return true
}
