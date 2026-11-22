import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'

import { clearAccessToken, getAccessToken, setAccessToken } from './token'

/** Refresh 接口的响应体：只返回新的 Access Token。 */
interface AccessTokenResponse {
  access: string
}

/** 标记请求已经因 401 重放过，避免刷新失败后无限递归。 */
interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

/**
 * 独立的 axios 实例，专门用于调用 `/auth/refresh/`。
 *
 * 不走业务拦截器：刷新请求本身失败时不能再触发「刷新并重放」，
 * 否则会递归打爆后端。
 */
export const refreshHttp: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  withCredentials: true,
})

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  // Refresh Token 走 httpOnly Cookie，浏览器请求需要携带凭据。
  withCredentials: true,
})

/** 单飞（single-flight）：并发 401 只触发一次刷新。 */
let refreshPromise: Promise<string> | null = null

/** 刷新最终失败时的回调（由 auth store 注册，用于清空内存态）。 */
let unauthorizedHandler: (() => void) | null = null

/** 注册「会话已失效」回调；重复注册时以最后一次为准。 */
export function setUnauthorizedHandler(handler: () => void): void {
  unauthorizedHandler = handler
}

/**
 * 用 httpOnly Cookie 换取新的 Access Token。
 *
 * - 并发调用共享同一个 Promise，避免重复刷新导致 Refresh 轮换互相失效；
 * - 失败时清空内存 Token 并通知会话失效，再把错误抛给调用方。
 */
export function refreshAccessToken(): Promise<string> {
  refreshPromise ??= refreshHttp
    .post<AccessTokenResponse>('/auth/refresh/')
    .then(({ data }) => {
      setAccessToken(data.access)
      return data.access
    })
    .catch((error: unknown) => {
      clearAccessToken()
      unauthorizedHandler?.()
      throw error
    })
    .finally(() => {
      refreshPromise = null
    })

  return refreshPromise
}

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken()
  if (token !== null) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }
  return config
})

http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error)) {
      throw error
    }

    const config = error.config as RetryableRequestConfig | undefined
    const isUnauthorized = error.response?.status === 401
    if (!isUnauthorized || config === undefined || config._retry === true) {
      throw error
    }

    config._retry = true
    const token = await refreshAccessToken()
    config.headers.set('Authorization', `Bearer ${token}`)
    return await http.request(config)
  },
)

export default http
