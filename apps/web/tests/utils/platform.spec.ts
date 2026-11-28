import { afterEach, describe, expect, it, vi } from 'vitest'

import { isMacPlatform } from '@/utils/platform'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('isMacPlatform', () => {
  it('优先使用 userAgentData.platform 并识别 Mac', () => {
    vi.stubGlobal('navigator', {
      platform: 'Win32',
      userAgent: 'Windows',
      userAgentData: { platform: 'macOS' },
    })

    expect(isMacPlatform()).toBe(true)
  })

  it('非 Mac 的 userAgentData.platform 不被其它字段覆盖', () => {
    vi.stubGlobal('navigator', {
      platform: 'iPad',
      userAgent: 'iPhone',
      userAgentData: { platform: 'Windows' },
    })

    expect(isMacPlatform()).toBe(false)
  })

  it('缺少 userAgentData 时使用 navigator.platform', () => {
    vi.stubGlobal('navigator', {
      platform: 'Win32',
      userAgent: 'Macintosh',
    })

    expect(isMacPlatform()).toBe(false)
  })

  it('平台字段为空时回退 userAgent，并不区分 iOS 标记大小写', () => {
    vi.stubGlobal('navigator', {
      platform: '',
      userAgent: 'Mozilla/5.0 (IPHONE; CPU iPhone OS 19_0 like Mac OS X)',
    })

    expect(isMacPlatform()).toBe(true)
  })

  it('所有平台字段均为空时按非 Mac 处理', () => {
    vi.stubGlobal('navigator', {
      platform: '',
      userAgent: '',
    })

    expect(isMacPlatform()).toBe(false)
  })
})
