import { describe, expect, it } from 'vitest'

import {
  DEFAULT_STICKY_NOTE_COLOR,
  STICKY_NOTE_COLOR_LABEL_KEYS,
  STICKY_NOTE_COLORS,
} from '@/constants/stickyNoteColors'

describe('便签受限色板', () => {
  it('固定镜像后端四色并使用暖黄默认值', () => {
    expect(STICKY_NOTE_COLORS).toEqual(['#FFF0D9', '#EAF3FF', '#EAF5EC', '#F3F0ED'])
    expect(DEFAULT_STICKY_NOTE_COLOR).toBe('#FFF0D9')
  })

  it('为每种便签颜色提供本地化文案键', () => {
    expect(STICKY_NOTE_COLOR_LABEL_KEYS).toEqual({
      '#FFF0D9': 'colors.warmYellow',
      '#EAF3FF': 'colors.lightBlue',
      '#EAF5EC': 'colors.lightGreen',
      '#F3F0ED': 'colors.neutralGray',
    })
  })
})
