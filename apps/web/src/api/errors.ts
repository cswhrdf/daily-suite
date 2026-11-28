import axios from 'axios'

export type ApiErrorKind =
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'validation'
  | 'rate_limited'
  | 'server'
  | 'unknown'

/** 业务 Store 与组件使用的统一错误结构。 */
export interface ApiError {
  kind: ApiErrorKind
  message: string
  i18nKey: string
  status: number | null
}

function normalizedError(
  kind: ApiErrorKind,
  i18nKey: string,
  message: string,
  status: number | null,
): ApiError {
  return { kind, i18nKey, message, status }
}

/** 将 Axios 与未知异常转换为稳定、可读的业务错误。 */
export function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return normalizedError(
      'unknown',
      'apiErrors.unknown',
      '发生未知错误，请稍后重试。',
      null,
    )
  }

  const status = error.response?.status
  if (status === undefined) {
    return normalizedError(
      'network',
      'apiErrors.network',
      '网络连接失败，请检查网络后重试。',
      null,
    )
  }

  switch (status) {
    case 400:
    case 422:
      return normalizedError(
        'validation',
        'apiErrors.validation',
        '提交内容不符合要求，请检查后重试。',
        status,
      )
    case 401:
      return normalizedError(
        'unauthorized',
        'apiErrors.unauthorized',
        '登录状态已失效，请重新登录。',
        status,
      )
    case 403:
      return normalizedError(
        'forbidden',
        'apiErrors.forbidden',
        '没有权限执行此操作。',
        status,
      )
    case 404:
      return normalizedError(
        'not_found',
        'apiErrors.notFound',
        '请求的资源不存在或已被删除。',
        status,
      )
    case 409:
      return normalizedError(
        'conflict',
        'apiErrors.conflict',
        '数据已发生变化，请刷新后重试。',
        status,
      )
    case 429:
      return normalizedError(
        'rate_limited',
        'apiErrors.rateLimited',
        '操作过于频繁，请稍后重试。',
        status,
      )
    default:
      if (status >= 500 && status <= 599) {
        return normalizedError(
          'server',
          'apiErrors.server',
          '服务暂时不可用，请稍后重试。',
          status,
        )
      }
      return normalizedError(
        'unknown',
        'apiErrors.unknown',
        '发生未知错误，请稍后重试。',
        status,
      )
  }
}
