import type { RouteRecordRaw } from 'vue-router'

/** 路由配置派生出的唯一导航项，桌面与移动导航共同使用。 */
export interface NavItem {
  title: string
  to: string
}

/** 按 Vue Router 规则拼接父路径与相对子路径。 */
function resolveRoutePath(parentPath: string, path: string): string {
  if (path.startsWith('/')) {
    return path
  }
  if (path === '') {
    return parentPath || '/'
  }

  return `${parentPath.replace(/\/$/, '')}/${path}`
}

/**
 * 递归收集显式标记为 `showInNav` 的路由。
 *
 * 导航标题必须存在；缺少标题的标记路由被视为配置不完整，不进入导航。
 */
export function collectNavItems(
  routes: readonly RouteRecordRaw[],
  parentPath = '',
): NavItem[] {
  return routes.flatMap((route) => {
    const to = resolveRoutePath(parentPath, route.path)
    const current =
      route.meta?.showInNav === true && typeof route.meta.title === 'string'
        ? [{ title: route.meta.title, to }]
        : []

    return [...current, ...collectNavItems(route.children ?? [], to)]
  })
}
