import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { RouteLocationNormalized } from 'vue-router'

import { setAccessToken } from '@/api/token'
import { authGuard } from '@/router/guard'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  refreshAccessToken: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
}))

vi.mock('@/api/http', () => ({
  default: { post: mocks.post },
  refreshAccessToken: mocks.refreshAccessToken,
  setUnauthorizedHandler: mocks.setUnauthorizedHandler,
}))

function createRoute(overrides: Partial<RouteLocationNormalized>): RouteLocationNormalized {
  return {
    fullPath: '/',
    path: '/',
    name: 'home',
    params: {},
    query: {},
    hash: '',
    matched: [],
    meta: {},
    redirectedFrom: undefined,
    ...overrides,
  }
}

function runGuard(to: RouteLocationNormalized): ReturnType<typeof authGuard> {
  return authGuard(to, createRoute({ name: 'from' }), () => {
    // 守卫使用返回值式 API，next 仅占位。
  })
}

beforeEach(() => {
  setAccessToken(null)
  mocks.refreshAccessToken.mockReset()
  setActivePinia(createPinia())
})

describe('authGuard', () => {
  it('未登录访问受保护路由时重定向到登录页并保留原地址', async () => {
    mocks.refreshAccessToken.mockRejectedValue(new Error('no cookie'))

    const result = await runGuard(
      createRoute({ name: 'home', fullPath: '/', meta: { requiresAuth: true } }),
    )

    expect(result).toEqual({ name: 'login', query: { redirect: '/' } })
  })

  it('凭 Refresh Cookie 恢复会话后放行受保护路由', async () => {
    mocks.refreshAccessToken.mockResolvedValue('restored-access')

    const result = await runGuard(
      createRoute({ name: 'home', fullPath: '/', meta: { requiresAuth: true } }),
    )

    expect(result).toBe(true)
    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('已登录访问登录页时跳回首页', async () => {
    setAccessToken('in-memory-access')

    const result = await runGuard(createRoute({ name: 'login', fullPath: '/login' }))

    expect(result).toEqual({ name: 'home' })
  })

  it('未登录访问公开路由（登录页）直接放行', async () => {
    mocks.refreshAccessToken.mockRejectedValue(new Error('no cookie'))

    const result = await runGuard(createRoute({ name: 'login', fullPath: '/login' }))

    expect(result).toBe(true)
  })
})
