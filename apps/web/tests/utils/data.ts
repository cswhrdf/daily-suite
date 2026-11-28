/**
 * 测试数据读取工具：用显式失败代替非空断言，保持断言信息可读。
 */

/** 取出必定存在的测试数据，缺失时显式失败。 */
export function required<T>(value: T | null | undefined, label: string): T {
  if (value === null || value === undefined) {
    throw new Error(`测试数据缺失：${label}`)
  }
  return value
}

/** 按下标取出夹具元素，越界时显式失败。 */
export function at<T>(items: readonly T[], index: number): T {
  return required(items[index], `下标 ${String(index)}`)
}
