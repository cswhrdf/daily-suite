/**
 * 测试夹具只允许被 `tests/` 引用，不得进入 `src/` 运行时链路。
 * 此独特标记用于构建后检查 `dist/`，确认夹具没有泄漏到生产产物。
 */
export const fixtureBuildMarker = 'DAILY_SUITE_TEST_FIXTURE_ONLY_9F3C7A'

export const noteFixtures = [
  { id: 'note-2', title: '第二条便签' },
  { id: 'note-1', title: '第一条便签' },
] as const
