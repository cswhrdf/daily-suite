import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import http, { refreshAccessToken, setUnauthorizedHandler } from '@/api/http'
import { getAccessToken, setAccessToken } from '@/api/token'

/** 登录表单提交的凭据。 */
export interface LoginCredentials {
  username: string
  password: string
}

/** 登录接口响应：Refresh Token 只存在于 httpOnly Cookie 中。 */
interface AccessTokenResponse {
  access: string
}

/**
 * 认证状态。
 *
 * Access Token 只保存在内存（同时镜像到 `api/token` 模块，供拦截器读取），
 * Refresh Token 完全由浏览器 Cookie 管理，前端脚本不可见。
 */
export const useAuthStore = defineStore('auth', () => {
  const accessToken = ref<string | null>(getAccessToken())
  const isAuthenticated = computed<boolean>(() => accessToken.value !== null)

  // 本次页面生命周期内是否已尝试过用 Cookie 恢复会话。
  // 失败后不再自动重试，避免每次路由跳转都打一次刷新接口。
  let sessionProbed = false

  function applyToken(token: string | null): void {
    accessToken.value = token
    setAccessToken(token)
  }

  function clearSession(): void {
    applyToken(null)
    sessionProbed = true
  }

  // 拦截器刷新失败时回调这里，保证 store 与内存 Token 同步清空。
  setUnauthorizedHandler(clearSession)

  async function login(credentials: LoginCredentials): Promise<void> {
    const { data } = await http.post<AccessTokenResponse>('/auth/login/', credentials)
    sessionProbed = true
    applyToken(data.access)
  }

  async function refresh(): Promise<string> {
    const token = await refreshAccessToken()
    // refreshAccessToken 已写入 token 模块；这里同步 store 的内存镜像。
    applyToken(token)
    sessionProbed = true
    return token
  }

  /**
   * 保证有可用的 Access Token。
   *
   * 内存里有 Token 直接返回；否则尝试用 Refresh Cookie 恢复一次。
   * 返回是否处于已认证状态（不抛异常，便于路由守卫使用）。
   */
  async function ensureSession(): Promise<boolean> {
    if (isAuthenticated.value) {
      return true
    }
    if (sessionProbed) {
      return false
    }
    try {
      await refresh()
      return true
    } catch {
      sessionProbed = true
      return false
    }
  }

  async function logout(): Promise<void> {
    try {
      await http.post('/auth/logout/')
    } catch {
      // 后端不可达时也继续清理本地状态（Cookie 会在过期后自然失效）。
    } finally {
      // 即使后端不可达也要清空本地内存态，避免界面显示为已登录。
      clearSession()
    }
  }

  return {
    accessToken,
    isAuthenticated,
    login,
    refresh,
    ensureSession,
    logout,
    clearSession,
  }
})
