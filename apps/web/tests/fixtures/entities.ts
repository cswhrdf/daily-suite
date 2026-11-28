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
