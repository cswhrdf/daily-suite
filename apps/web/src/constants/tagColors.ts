/** 与后端受控色板保持一致；颜色之外，界面始终同时展示标签文字或颜色名称。 */
export const TAG_COLORS = [
  '#C2410C',
  '#1867C0',
  '#217A46',
  '#8A5A00',
  '#BA1A1A',
  '#5E35B1',
  '#00838F',
  '#546E7A',
] as const

export type TagColor = (typeof TAG_COLORS)[number]

export const TAG_COLOR_LABEL_KEYS: Record<TagColor, string> = {
  '#C2410C': 'colors.orange',
  '#1867C0': 'colors.blue',
  '#217A46': 'colors.green',
  '#8A5A00': 'colors.yellow',
  '#BA1A1A': 'colors.red',
  '#5E35B1': 'colors.purple',
  '#00838F': 'colors.cyan',
  '#546E7A': 'colors.gray',
}

export const DEFAULT_TAG_COLOR: TagColor = TAG_COLORS[0]
