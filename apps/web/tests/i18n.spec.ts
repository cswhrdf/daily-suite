import { describe, expect, it } from 'vitest'

import { isAppLocale, toVuetifyLocale } from '@/i18n'

describe('i18n locale 映射', () => {
  it('支持应用语言并将未知语言回退到简体中文', () => {
    expect(isAppLocale('zh-CN')).toBe(true)
    expect(isAppLocale('unknown')).toBe(false)
    expect(toVuetifyLocale('en')).toBe('en')
    expect(toVuetifyLocale('unknown')).toBe('zh-Hans')
  })
})
