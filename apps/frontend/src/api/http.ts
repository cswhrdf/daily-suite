import axios, {
  type AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'

/**
 * Access Token 只保存在内存中（阶段 5 再接入刷新与登出流程），
 * 不写入 localStorage / sessionStorage。
 */
let accessToken: string | null = null

export function setAccessToken(token: string | null): void {
  accessToken = token
}

const http: AxiosInstance = axios.create({
  baseURL: '/api',
  timeout: 15_000,
  // Refresh Token 走 httpOnly Cookie，浏览器请求需要携带凭据。
  withCredentials: true,
})

http.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  if (accessToken !== null) {
    config.headers.set('Authorization', `Bearer ${accessToken}`)
  }
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    // 占位：阶段 5 在此统一处理 401（刷新 Access Token 或跳转登录页）。
    return Promise.reject(error)
  },
)

export default http
