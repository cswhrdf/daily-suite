/**
 * Access Token 的唯一内存存储。
 *
 * 刻意只放在模块级变量里：不写 localStorage / sessionStorage / IndexedDB，
 * 关闭标签页即失效；页面刷新后凭 httpOnly Refresh Cookie 重新换取。
 */

let accessToken: string | null = null

/** 读取当前内存中的 Access Token。 */
export function getAccessToken(): string | null {
  return accessToken
}

/** 写入或清除内存中的 Access Token（`null` 表示未登录）。 */
export function setAccessToken(token: string | null): void {
  accessToken = token
}

/** 清除内存中的 Access Token。 */
export function clearAccessToken(): void {
  accessToken = null
}
