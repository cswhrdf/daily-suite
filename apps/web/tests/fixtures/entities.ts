import type { StickyNote } from '@/api/stickyNotes'

/**
 * 测试夹具只允许被 `tests/` 引用，不得进入 `src/` 运行时链路。
 * 此独特标记用于构建后检查 `dist/`，确认夹具没有泄漏到生产产物。
 */
export const fixtureBuildMarker = 'DAILY_SUITE_TEST_FIXTURE_ONLY_9F3C7A'

export const noteFixtures = [
  { id: 'note-2', title: '第二条便签' },
  { id: 'note-1', title: '第一条便签' },
] as const

export const tagFixtures = [
  {
    id: 1,
    name: '家庭',
    color: '#C2410C',
    created_at: '2026-11-01T08:00:00Z',
    updated_at: '2026-11-01T08:00:00Z',
  },
  {
    id: 2,
    name: '工作',
    color: '#1867C0',
    created_at: '2026-11-02T08:00:00Z',
    updated_at: '2026-11-02T08:00:00Z',
  },
] as const

/** 便签读取结果里的标签摘要：后端 ``TagSummarySerializer`` 只回 id/name/color。 */
export const tagSummaryFixtures = tagFixtures.map((tag) => ({
  id: tag.id,
  name: tag.name,
  color: tag.color,
}))

export const stickyNoteFixtures: StickyNote[] = [
  {
    id: 1,
    title: '本周采购',
    content: '牛奶、鸡蛋、燕麦',
    color: '#FFF0D9',
    is_pinned: true,
    is_archived: false,
    position: 0,
    tags: [{ id: 1, name: '家庭', color: '#C2410C' }],
    created_at: '2026-11-26T08:00:00Z',
    updated_at: '2026-11-27T08:00:00Z',
  },
  {
    id: 2,
    title: '维修电话',
    content: '工作日 9 点后联系物业',
    color: '#EAF3FF',
    is_pinned: false,
    is_archived: false,
    position: 1,
    tags: [{ id: 2, name: '工作', color: '#1867C0' }],
    created_at: '2026-11-26T09:00:00Z',
    updated_at: '2026-11-28T08:00:00Z',
  },
  {
    id: 3,
    title: '',
    content: '阅读摘记',
    color: '#EAF5EC',
    is_pinned: false,
    is_archived: true,
    position: 2,
    tags: [],
    created_at: '2026-11-25T09:00:00Z',
    updated_at: '2026-11-26T09:00:00Z',
  },
]

/** 返回独立副本，避免不同用例通过嵌套标签数组互相污染。 */
export function copyStickyNoteFixtures(): StickyNote[] {
  return stickyNoteFixtures.map((note) => ({ ...note, tags: note.tags.map((tag) => ({ ...tag })) }))
}
