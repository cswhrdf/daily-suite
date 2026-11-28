import { defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'

import router from '@/router'
import { collectNavItems } from '@/router/nav'

const page = defineComponent({ template: '<div />' })

describe('collectNavItems', () => {
  it('递归展开嵌套路由，只保留 showInNav 为 true 且带标题的项', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/',
        component: page,
        meta: { requiresAuth: true },
        children: [
          {
            path: '',
            name: 'home',
            component: page,
            meta: { showInNav: true, title: 'nav.home' },
          },
          {
            path: 'hidden',
            component: page,
            meta: { showInNav: false, title: 'nav.hidden' },
          },
          {
            path: 'tools',
            component: page,
            children: [
              {
                path: 'todos',
                component: page,
                meta: { showInNav: true, title: 'nav.todos' },
              },
              {
                path: 'missing-title',
                component: page,
                meta: { showInNav: true },
              },
            ],
          },
        ],
      },
      {
        path: '/login',
        component: page,
        meta: { requiresAuth: false },
      },
    ]

    expect(collectNavItems(routes)).toEqual([
      { title: 'nav.home', to: '/' },
      { title: 'nav.todos', to: '/tools/todos' },
    ])
  })

  it('空父路径下的空子路径解析为根路径', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '',
        component: page,
        meta: { showInNav: true, title: 'nav.home' },
      },
    ]

    expect(collectNavItems(routes)).toEqual([{ title: 'nav.home', to: '/' }])
  })

  it('保留绝对子路由路径，并且不修改路由配置', () => {
    const routes: RouteRecordRaw[] = [
      {
        path: '/parent',
        component: page,
        children: [
          {
            path: '/absolute',
            component: page,
            meta: { showInNav: true, title: 'nav.absolute' },
          },
        ],
      },
    ]
    const snapshot = structuredClone(routes)

    expect(collectNavItems(routes)).toEqual([{ title: 'nav.absolute', to: '/absolute' }])
    expect(routes).toEqual(snapshot)
  })
})

describe('应用路由 meta', () => {
  it('真实路由注册四个导航子项，并保留登录页的公开边界', () => {
    const layout = router.options.routes.find((route) => route.path === '/')
    const login = router.options.routes.find((route) => route.path === '/login')

    expect(layout?.meta).toMatchObject({ requiresAuth: true })
    expect(layout?.component).toBeTypeOf('function')
    expect(login?.meta).toMatchObject({ requiresAuth: false })
    expect(login?.meta?.showInNav).toBeUndefined()

    expect(
      layout?.children?.map((route) => ({
        name: route.name,
        path: route.path,
        title: route.meta?.title,
        showInNav: route.meta?.showInNav,
        requiresAuth: route.meta?.requiresAuth,
        dynamicImport: typeof route.component === 'function',
      })),
    ).toEqual([
      {
        name: 'home',
        path: '',
        title: 'nav.home',
        showInNav: true,
        requiresAuth: true,
        dynamicImport: true,
      },
      {
        name: 'sticky-notes',
        path: 'sticky-notes',
        title: 'nav.stickyNotes',
        showInNav: true,
        requiresAuth: true,
        dynamicImport: true,
      },
      {
        name: 'todos',
        path: 'todos',
        title: 'nav.todos',
        showInNav: true,
        requiresAuth: true,
        dynamicImport: true,
      },
      {
        name: 'calendar',
        path: 'calendar',
        title: 'nav.calendar',
        showInNav: true,
        requiresAuth: true,
        dynamicImport: true,
      },
    ])
  })

  it('从真实路由生成唯一的四项主导航清单', () => {
    expect(collectNavItems(router.options.routes)).toEqual([
      { title: 'nav.home', to: '/' },
      { title: 'nav.stickyNotes', to: '/sticky-notes' },
      { title: 'nav.todos', to: '/todos' },
      { title: 'nav.calendar', to: '/calendar' },
    ])
  })

  it('执行业务空态页面的懒加载并解析出组件', async () => {
    const layout = router.options.routes.find((route) => route.path === '/')
    const lazyRoutes = ['sticky-notes', 'todos', 'calendar'].map((name) => {
      const route = layout?.children?.find((child) => child.name === name)
      expect(route?.component).toBeTypeOf('function')
      return route?.component as () => Promise<{ default: object }>
    })

    const modules = await Promise.all(lazyRoutes.map((load) => load()))

    expect(modules).toHaveLength(3)
    for (const module of modules) {
      expect(module.default).toBeTypeOf('object')
    }
  })
})
