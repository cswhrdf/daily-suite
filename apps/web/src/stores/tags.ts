import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { ApiError } from '@/api/errors'
import {
  create as createTag,
  list as listTags,
  remove as removeTag,
  update as updateTag,
  type Tag,
  type TagInput,
} from '@/api/tags'
import { createRequestState, type RequestState } from '@/types/request'
import {
  itemsById as indexById,
  ids as entityIds,
  mutationPendingIds as createMutationPendingIds,
} from '@/utils/normalize'

const CREATE_PENDING_KEY = 'create'

function entityKey(id: Tag['id']): string {
  return String(id)
}

/** 全局标签状态；所有工具页共享同一组规范化实体。 */
export const useTagsStore = defineStore('tags', () => {
  const itemsById = ref<Record<string, Tag>>({})
  const ids = ref<string[]>([])
  const listRequest = ref<RequestState<ApiError>>(createRequestState<ApiError>())
  const mutationPendingIds = ref(createMutationPendingIds())
  let nextTemporaryId = 0

  const ordered = computed<Tag[]>(() =>
    ids.value.flatMap((id) => {
      const tag = itemsById.value[id]
      return tag === undefined ? [] : [tag]
    }),
  )
  const byId = computed(() => (id: Tag['id']) => itemsById.value[entityKey(id)])
  const options = computed(() =>
    ordered.value.map((tag) => ({ title: tag.name, value: tag.id, tag })),
  )

  function snapshot(): { itemsById: Record<string, Tag>; ids: string[] } {
    return {
      itemsById: { ...itemsById.value },
      ids: [...ids.value],
    }
  }

  function restore(previous: ReturnType<typeof snapshot>): void {
    itemsById.value = previous.itemsById
    ids.value = previous.ids
  }

  async function fetchAll(): Promise<void> {
    listRequest.value.status = listRequest.value.lastLoadedAt === null ? 'loading' : 'refreshing'
    listRequest.value.error = null
    try {
      const tags = await listTags()
      itemsById.value = indexById(tags, (tag) => entityKey(tag.id))
      ids.value = entityIds(tags, (tag) => entityKey(tag.id))
      listRequest.value.status = 'success'
      listRequest.value.lastLoadedAt = Date.now()
    } catch (error: unknown) {
      // API 边界已经统一转换错误，这里保留其字段供页面和提示组件使用。
      const apiError = error as ApiError
      listRequest.value.status = 'error'
      listRequest.value.error = apiError
      throw apiError
    }
  }

  async function create(input: TagInput): Promise<Tag | undefined> {
    if (mutationPendingIds.value.has(CREATE_PENDING_KEY)) {
      return undefined
    }

    mutationPendingIds.value.add(CREATE_PENDING_KEY)
    const previous = snapshot()
    const temporaryId = --nextTemporaryId
    const temporaryKey = entityKey(temporaryId)
    const now = new Date().toISOString()
    itemsById.value = {
      ...itemsById.value,
      [temporaryKey]: { id: temporaryId, ...input, created_at: now, updated_at: now },
    }
    ids.value = [temporaryKey, ...ids.value]

    try {
      const tag = await createTag(input)
      const nextItems = Object.fromEntries(
        Object.entries(itemsById.value).filter(([id]) => id !== temporaryKey),
      )
      nextItems[entityKey(tag.id)] = tag
      itemsById.value = nextItems
      ids.value = ids.value.map((id) => (id === temporaryKey ? entityKey(tag.id) : id))
      return tag
    } catch (error: unknown) {
      restore(previous)
      throw error
    } finally {
      mutationPendingIds.value.delete(CREATE_PENDING_KEY)
    }
  }

  async function update(id: Tag['id'], input: Partial<TagInput>): Promise<Tag | undefined> {
    const key = entityKey(id)
    const current = itemsById.value[key]
    if (current === undefined || mutationPendingIds.value.has(key)) {
      return undefined
    }

    mutationPendingIds.value.add(key)
    const previous = snapshot()
    itemsById.value = { ...itemsById.value, [key]: { ...current, ...input } }

    try {
      const tag = await updateTag(id, input)
      itemsById.value = { ...itemsById.value, [key]: tag }
      return tag
    } catch (error: unknown) {
      restore(previous)
      throw error
    } finally {
      mutationPendingIds.value.delete(key)
    }
  }

  async function remove(id: Tag['id']): Promise<boolean> {
    const key = entityKey(id)
    if (itemsById.value[key] === undefined || mutationPendingIds.value.has(key)) {
      return false
    }

    mutationPendingIds.value.add(key)
    const previous = snapshot()
    itemsById.value = Object.fromEntries(
      Object.entries(itemsById.value).filter(([id]) => id !== key),
    )
    ids.value = ids.value.filter((itemId) => itemId !== key)

    try {
      await removeTag(id)
      return true
    } catch (error: unknown) {
      restore(previous)
      throw error
    } finally {
      mutationPendingIds.value.delete(key)
    }
  }

  return {
    itemsById,
    ids,
    listRequest,
    mutationPendingIds,
    ordered,
    byId,
    options,
    fetchAll,
    create,
    update,
    remove,
  }
})
