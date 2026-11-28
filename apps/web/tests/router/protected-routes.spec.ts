import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { setAccessToken } from '@/api/token'
import router from '@/router'

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

beforeEach(() => {
  setAccessToken(null)
  setActivePinia(createPinia())
  mocks.refreshAccessToken.mockReset()
  mocks.refreshAccessToken.mockRejectedValue(new Error('no cookie'))
})

describe('受保护业务路由', () => {
  it.each(['/todos', '/calendar'])(
    '未登录直接访问 %s 时先恢复会话，失败后保留原地址跳登录',
    async (path) => {
      await router.push(path)

      expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1)
      expect(router.currentRoute.value.name).toBe('login')
      expect(router.currentRoute.value.path).toBe('/login')
      expect(router.currentRoute.value.query['redirect']).toBe(path)
    },
  )
})
