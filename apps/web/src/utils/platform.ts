/**
 * 浏览器平台信息的最小类型描述。
 * 不直接继承 Navigator：其中 platform 已被标记弃用，
 * 这里仅作为旧浏览器的兜底字段自行声明。
 */
interface NavigatorPlatformInfo {
  readonly platform?: string
  readonly userAgent?: string
  readonly userAgentData?: {
    readonly platform?: string
  }
}

const MAC_PLATFORM_PATTERN = /mac|iphone|ipad|ipod/i

/** 取第一个非空字符串，全部为空时返回空串。 */
function firstNonEmpty(values: readonly (string | undefined)[]): string {
  return values.find((value): value is string => value !== undefined && value !== '') ?? ''
}

/** 根据浏览器平台信息判断是否应展示 macOS 风格的修饰键。 */
export function isMacPlatform(): boolean {
  const browserNavigator = navigator as NavigatorPlatformInfo
  const platform = firstNonEmpty([
    browserNavigator.userAgentData?.platform,
    browserNavigator.platform,
    browserNavigator.userAgent,
  ])

  return MAC_PLATFORM_PATTERN.test(platform)
}
