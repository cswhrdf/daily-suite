/** 异步请求的生命周期状态；刷新已有数据时使用 `refreshing`。 */
export type RequestStatus = 'idle' | 'loading' | 'refreshing' | 'success' | 'error'

/** Store 请求状态的统一结构，时间戳使用 Unix 毫秒。 */
export interface RequestState<TError = unknown> {
  status: RequestStatus
  error: TError | null
  lastLoadedAt: number | null
}

/** 创建互不共享的初始请求状态。 */
export function createRequestState<TError = unknown>(): RequestState<TError> {
  return {
    status: 'idle',
    error: null,
    lastLoadedAt: null,
  }
}
