/** 便签正文底色镜像后端的受限色板，不承担成功、错误等语义。 */
export const STICKY_NOTE_COLORS = ['#FFF0D9', '#EAF3FF', '#EAF5EC', '#F3F0ED'] as const

export type StickyNoteColor = (typeof STICKY_NOTE_COLORS)[number]

export const DEFAULT_STICKY_NOTE_COLOR: StickyNoteColor = STICKY_NOTE_COLORS[0]
