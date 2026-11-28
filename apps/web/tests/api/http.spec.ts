import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import http, { refreshHttp, setUnauthorizedHandler } from '@/api/http'
import { getAccessToken, setAccessToken } from '@/api/token'

function okResponse<T>(data: T, config: InternalAxiosRequestConfig): AxiosResponse<T> {
  return { data, status: 200, statusText: 'OK', headers: {}, config }
}

function unauthorizedError(config: InternalAxiosRequestConfig): AxiosError {
  return new AxiosError('Unauthorized', 'ERR_BAD_REQUEST', config, undefined, {
    data: { detail: '未认证' },
    status: 401,
    statusText: 'Unauthorized',
    headers: {},
    config,
  })
}

beforeEach(() => {
  setAccessToken(null)
  setUnauthorizedHandler(() => {
    // 默认回调为空实现，具体用例按需覆盖。
  })
})

describe('http 拦截器', () => {
  it('收到 401 时用 Cookie 刷新并重放原请求一次', async () => {
    const requests: InternalAxiosRequestConfig[] = []
    http.defaults.adapter = (config) => {
      requests.push(config)
      if (requests.length === 1) {
        throw unauthorizedError(config)
      }
      return Promise.resolve(okResponse({ ok: true }, config))
    }
    const refreshAdapter = vi.fn((config: InternalAxiosRequestConfig) =>
      Promise.resolve(okResponse({ access: 'new-access' }, config)),
    )
    refreshHttp.defaults.adapter = refreshAdapter

    const response = await http.get<{ ok: boolean }>('/protected/')

    expect(response.data).toEqual({ ok: true })
    // 只刷新一次，且重放请求携带新的 Access Token。
    expect(refreshAdapter).toHaveBeenCalledTimes(1)
    expect(requests).toHaveLength(2)
    expect(requests[1]?.headers.get('Authorization')).toBe('Bearer new-access')
    expect(getAccessToken()).toBe('new-access')
  })

  it('并发 401 共享同一次刷新（单飞）', async () => {
    let pendingFailures = 2
    http.defaults.adapter = (config) => {
      if (pendingFailures > 0) {
        pendingFailures -= 1
        throw unauthorizedError(config)
      }
      return Promise.resolve(okResponse({ ok: true }, config))
    }
    const refreshAdapter = vi.fn((config: InternalAxiosRequestConfig) =>
      Promise.resolve(okResponse({ access: 'fresh-access' }, config)),
    )
    refreshHttp.defaults.adapter = refreshAdapter

    const [first, second] = await Promise.all([http.get('/a/'), http.get('/b/')])

    expect(first.status).toBe(200)
    expect(second.status).toBe(200)
    // 两个并发请求只触发一次 Refresh。
    expect(refreshAdapter).toHaveBeenCalledTimes(1)
  })

  it('刷新失败时清空内存 Token 并通知会话失效', async () => {
    const onUnauthorized = vi.fn()
    setUnauthorizedHandler(onUnauthorized)
    setAccessToken('stale-access')
    http.defaults.adapter = (config) => {
      throw unauthorizedError(config)
    }
    refreshHttp.defaults.adapter = (config) => {
      throw unauthorizedError(config)
    }

    await expect(http.get('/protected/')).rejects.toBeInstanceOf(AxiosError)

    expect(getAccessToken()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('非 Axios 异常直接透传，不进入刷新流程', async () => {
    const error = new Error('adapter failure')
    const refreshAdapter = vi.fn()
    refreshHttp.defaults.adapter = refreshAdapter
    http.defaults.adapter = () => {
      throw error
    }

    await expect(http.get('/protected/')).rejects.toBe(error)
    expect(refreshAdapter).not.toHaveBeenCalled()
  })

  it('非 401 错误直接透传，不触发刷新', async () => {
    const refreshAdapter = vi.fn()
    refreshHttp.defaults.adapter = refreshAdapter
    http.defaults.adapter = (config) => {
      throw new AxiosError('Server Error', 'ERR_BAD_RESPONSE', config, undefined, {
        data: null,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {},
        config,
      })
    }

    await expect(http.get('/protected/')).rejects.toBeInstanceOf(AxiosError)

    expect(refreshAdapter).not.toHaveBeenCalled()
  })
})
