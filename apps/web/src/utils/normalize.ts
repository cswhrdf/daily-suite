/** 按实体键建立索引；键重复时保留数组中最后一个实体。 */
export function itemsById<T>(
  entities: readonly T[],
  keyFn: (entity: T) => string,
): Record<string, T> {
  return Object.fromEntries(entities.map((entity) => [keyFn(entity), entity] as const))
}

/** 按输入顺序提取实体 ID。 */
export function ids<T>(entities: readonly T[], keyFn: (entity: T) => string): string[] {
  return entities.map(keyFn)
}

/** 创建提交中实体 ID 集合，调用方通过 `add`、`delete` 与 `has` 追踪状态。 */
export function mutationPendingIds(initialIds: Iterable<string> = []): Set<string> {
  return new Set(initialIds)
}
