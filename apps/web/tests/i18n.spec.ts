import { describe, expect, it } from 'vitest'

import { isAppLocale, toVuetifyLocale } from '@/i18n'
import en from '@/i18n/locales/en'
import zhCN from '@/i18n/locales/zh-CN'

describe('i18n locale 映射', () => {
  it('支持应用语言并将未知语言回退到简体中文', () => {
    expect(isAppLocale('zh-CN')).toBe(true)
    expect(isAppLocale('unknown')).toBe(false)
    expect(toVuetifyLocale('en')).toBe('en')
    expect(toVuetifyLocale('unknown')).toBe('zh-Hans')
  })

  it('为中英文提供键名一致的全部颜色名称', () => {
    expect(zhCN.colors).toEqual({
      orange: '橙色',
      blue: '蓝色',
      green: '绿色',
      yellow: '黄色',
      red: '红色',
      purple: '紫色',
      cyan: '青色',
      gray: '灰色',
      warmYellow: '暖黄',
      lightBlue: '浅蓝',
      lightGreen: '浅绿',
      neutralGray: '中性灰',
    })
    expect(en.colors).toEqual({
      orange: 'Orange',
      blue: 'Blue',
      green: 'Green',
      yellow: 'Yellow',
      red: 'Red',
      purple: 'Purple',
      cyan: 'Cyan',
      gray: 'Gray',
      warmYellow: 'Warm yellow',
      lightBlue: 'Light blue',
      lightGreen: 'Light green',
      neutralGray: 'Neutral gray',
    })
    expect(Object.keys(en.colors)).toEqual(Object.keys(zhCN.colors))
  })
})
