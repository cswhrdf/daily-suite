import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getAccessToken, setAccessToken } from '@/api/token'
import { useAuthStore } from '@/stores/auth'

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
  localStorage.clear()
  setAccessToken(null)
  mocks.post.mockReset()
  mocks.refreshAccessToken.mockReset()
})

describe('auth store', () => {
  it('登录后 Access Token 只存在内存，localStorage 中没有任何 Token', async () => {
    mocks.post.mockResolvedValue({ data: { access: 'access-token' } })
    setActivePinia(createPinia())
    const auth = useAuthStore()

    await auth.login({ username: 'alice', password: 'secret' })

    expect(mocks.post).toHaveBeenCalledWith('/auth/login/', {
      username: 'alice',
      password: 'secret',
    })
    expect(auth.isAuthenticated).toBe(true)
    expect(auth.accessToken).toBe('access-token')
    expect(getAccessToken()).toBe('access-token')
    expect(localStorage.length).toBe(0)
    expect(localStorage.getItem('access')).toBeNull()
  })

  it('刷新动作把新 Access Token 写入内存', async () => {
    mocks.refreshAccessToken.mockResolvedValue('refreshed-token')
    setActivePinia(createPinia())
    const auth = useAuthStore()

    await auth.refresh()

    expect(auth.accessToken).toBe('refreshed-token')
    expect(getAccessToken()).toBe('refreshed-token')
  })

  it('会话恢复失败后不再重复请求刷新接口', async () => {
    mocks.refreshAccessToken.mockRejectedValue(new Error('no cookie'))
    setActivePinia(createPinia())
    const auth = useAuthStore()

    await expect(auth.ensureSession()).resolves.toBe(false)
    await expect(auth.ensureSession()).resolves.toBe(false)

    expect(mocks.refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(auth.isAuthenticated).toBe(false)
  })

  it('登出清除内存 Token，即使后端请求失败', async () => {
    mocks.post.mockRejectedValue(new Error('network down'))
    setAccessToken('still-there')
    setActivePinia(createPinia())
    const auth = useAuthStore()

    await auth.logout()

    expect(auth.isAuthenticated).toBe(false)
    expect(auth.accessToken).toBeNull()
    expect(getAccessToken()).toBeNull()
  })
})
