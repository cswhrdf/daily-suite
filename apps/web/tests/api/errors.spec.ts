import { AxiosError, AxiosHeaders, type InternalAxiosRequestConfig } from 'axios'
import { describe, expect, it } from 'vitest'

import { toApiError } from '@/api/errors'

function axiosStatusError(status: number): AxiosError {
  const config: InternalAxiosRequestConfig = { headers: new AxiosHeaders() }
  return new AxiosError('request failed', 'ERR_BAD_RESPONSE', config, undefined, {
    data: null,
    status,
    statusText: 'Error',
    headers: {},
    config,
  })
}

describe('toApiError', () => {
  it('把无响应的 Axios 异常归为网络错误', () => {
    expect(toApiError(new AxiosError('offline', 'ERR_NETWORK'))).toEqual({
      kind: 'network',
      i18nKey: 'apiErrors.network',
      message: '网络连接失败，请检查网络后重试。',
      status: null,
    })
  })

  it.each([
    [400, 'validation', 'apiErrors.validation', '提交内容不符合要求，请检查后重试。'],
    [422, 'validation', 'apiErrors.validation', '提交内容不符合要求，请检查后重试。'],
    [401, 'unauthorized', 'apiErrors.unauthorized', '登录状态已失效，请重新登录。'],
    [403, 'forbidden', 'apiErrors.forbidden', '没有权限执行此操作。'],
    [404, 'not_found', 'apiErrors.notFound', '请求的资源不存在或已被删除。'],
    [409, 'conflict', 'apiErrors.conflict', '数据已发生变化，请刷新后重试。'],
    [429, 'rate_limited', 'apiErrors.rateLimited', '操作过于频繁，请稍后重试。'],
    [500, 'server', 'apiErrors.server', '服务暂时不可用，请稍后重试。'],
    [503, 'server', 'apiErrors.server', '服务暂时不可用，请稍后重试。'],
  ] as const)('把 HTTP %i 转为 %s 错误', (status, kind, i18nKey, message) => {
    expect(toApiError(axiosStatusError(status))).toEqual({
      kind,
      i18nKey,
      message,
      status,
    })
  })

  it('保留未覆盖 HTTP 状态并归为未知错误', () => {
    expect(toApiError(axiosStatusError(418))).toEqual({
      kind: 'unknown',
      i18nKey: 'apiErrors.unknown',
      message: '发生未知错误，请稍后重试。',
      status: 418,
    })
  })

  it('非 Axios 异常不会泄漏原始消息', () => {
    expect(toApiError(new Error('private details'))).toEqual({
      kind: 'unknown',
      i18nKey: 'apiErrors.unknown',
      message: '发生未知错误，请稍后重试。',
      status: null,
    })
  })
})
