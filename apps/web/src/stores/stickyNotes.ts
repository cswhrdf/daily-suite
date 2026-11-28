import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

import type { ApiError } from '@/api/errors'
import {
  convertToTodo as convertStickyNote,
  create as createStickyNote,
  list as listStickyNotes,
  remove as removeStickyNote,
  reorder as reorderStickyNotes,
  update as updateStickyNote,
  type ConvertedTodo,
  type ConvertStickyNoteInput,
  type ConvertStickyNoteResult,
  type StickyNote,
  type StickyNoteFilters,
  type StickyNoteInput,
} from '@/api/stickyNotes'
import { useTagsStore } from '@/stores/tags'
import { createRequestState, type RequestState } from '@/types/request'
import {
  itemsById as indexById,
  ids as entityIds,
  mutationPendingIds as createMutationPendingIds,
} from '@/utils/normalize'

const CREATE_PENDING_KEY = 'create'
const REORDER_PENDING_KEY = 'reorder'

export const DEFAULT_STICKY_NOTE_FILTERS: StickyNoteFilters = {
  tag: null,
  search: '',
  is_archived: false,
  ordering: '-is_pinned,position',
}

export type StickyNotePatch = Partial<StickyNoteInput> &
  Partial<Pick<StickyNote, 'is_pinned' | 'is_archived'>>

function entityKey(id: StickyNote['id']): string {
  return String(id)
}

/** 便签列表与转换产生的待办摘要；所有修改都经过乐观更新或服务端确认。 */
export const useStickyNotesStore = defineStore('sticky-notes', () => {
  const tagsStore = useTagsStore()
  const itemsById = ref<Record<string, StickyNote>>({})
  const ids = ref<string[]>([])
  const filters = ref<StickyNoteFilters>({ ...DEFAULT_STICKY_NOTE_FILTERS })
  const pagination = ref({ count: 0, next: null as string | null, previous: null as string | null })
  const listRequest = ref<RequestState<ApiError>>(createRequestState<ApiError>())
  const editingId = ref<number | null>(null)
  const mutationPendingIds = ref(createMutationPendingIds())
  const todosById = ref<Record<string, ConvertedTodo>>({})
  let listSequence = 0
  let nextTemporaryId = 0

  const ordered = computed<StickyNote[]>(() =>
    ids.value.flatMap((id) => {
      const note = itemsById.value[id]
      return note === undefined ? [] : [note]
    }),
  )
  const visible = computed<StickyNote[]>(() => {
    const search = filters.value.search.trim().toLocaleLowerCase()
    return ordered.value.filter((note) => {
      const matchesTag =
        filters.value.tag === null || note.tags.some((tag) => tag.id === filters.value.tag)
      const matchesArchive = note.is_archived === filters.value.is_archived
      const matchesSearch =
        search === '' ||
        note.title.toLocaleLowerCase().includes(search) ||
        note.content.toLocaleLowerCase().includes(search)
      return matchesTag && matchesArchive && matchesSearch
    })
  })
  const pinned = computed(() => visible.value.filter((note) => note.is_pinned))
  const archived = computed(() => Object.values(itemsById.value).filter((note) => note.is_archived))
  const recent = computed(() =>
    [...visible.value].sort((left, right) => right.updated_at.localeCompare(left.updated_at)),
  )
  const byId = computed(() => (id: StickyNote['id']) => itemsById.value[entityKey(id)])

  function summaries(tagIds: readonly number[]): StickyNote['tags'] {
    return tagIds.flatMap((id) => {
      const tag = tagsStore.byId(id)
      return tag === undefined ? [] : [{ id: tag.id, name: tag.name, color: tag.color }]
    })
  }

  function optimisticPatch(note: StickyNote, patch: StickyNotePatch): StickyNote {
    const { tag_ids: tagIds, ...fields } = patch
    return {
      ...note,
      ...fields,
      ...(tagIds === undefined ? {} : { tags: summaries(tagIds) }),
    }
  }

  function upsertMany(notes: readonly StickyNote[]): void {
    const nextItems = { ...itemsById.value }
    const nextIds = [...ids.value]
    for (const note of notes) {
      const key = entityKey(note.id)
      if (nextItems[key] === undefined) {
        nextIds.push(key)
      }
      nextItems[key] = note
    }
    itemsById.value = nextItems
    ids.value = nextIds
  }

  async function fetchList(nextFilters: StickyNoteFilters = filters.value): Promise<void> {
    const sequence = ++listSequence
    filters.value = { ...nextFilters }
    listRequest.value.status = listRequest.value.lastLoadedAt === null ? 'loading' : 'refreshing'
    listRequest.value.error = null
    try {
      // 后端重排只接受「该用户全部未归档便签」的完整顺序，因此标签与搜索仅在本地过滤，
      // 服务端请求始终取回当前归档范围内的全部便签，保证 Store 持有可安全重排的全集。
      const notes = await listStickyNotes({ ...nextFilters, tag: null, search: '' })
      if (sequence !== listSequence) {
        return
      }
      itemsById.value = indexById(notes, (note) => entityKey(note.id))
      ids.value = entityIds(notes, (note) => entityKey(note.id))
      pagination.value = { count: notes.length, next: null, previous: null }
      listRequest.value.status = 'success'
      listRequest.value.lastLoadedAt = Date.now()
    } catch (error: unknown) {
      if (sequence !== listSequence) {
        return
      }
      const apiError = error as ApiError
      listRequest.value.status = 'error'
      listRequest.value.error = apiError
      throw apiError
    }
  }

  async function create(input: StickyNoteInput): Promise<StickyNote | undefined> {
    if (mutationPendingIds.value.has(CREATE_PENDING_KEY)) {
      return undefined
    }

    mutationPendingIds.value.add(CREATE_PENDING_KEY)
    const temporaryId = --nextTemporaryId
    const temporaryKey = entityKey(temporaryId)
    const now = new Date().toISOString()
    const firstPosition = ordered.value[0]?.position ?? 0
    const temporary: StickyNote = {
      id: temporaryId,
      ...input,
      tags: summaries(input.tag_ids),
      is_pinned: false,
      is_archived: false,
      position: firstPosition - 1,
      created_at: now,
      updated_at: now,
    }
    itemsById.value = { ...itemsById.value, [temporaryKey]: temporary }
    ids.value = [temporaryKey, ...ids.value]

    try {
      const note = await createStickyNote(input)
      const nextItems = Object.fromEntries(
        Object.entries(itemsById.value).filter(([id]) => id !== temporaryKey),
      )
      nextItems[entityKey(note.id)] = note
      itemsById.value = nextItems
      ids.value = ids.value.map((id) => (id === temporaryKey ? entityKey(note.id) : id))
      pagination.value.count += 1
      return note
    } catch (error: unknown) {
      itemsById.value = Object.fromEntries(
        Object.entries(itemsById.value).filter(([id]) => id !== temporaryKey),
      )
      ids.value = ids.value.filter((id) => id !== temporaryKey)
      throw error
    } finally {
      mutationPendingIds.value.delete(CREATE_PENDING_KEY)
    }
  }

  async function update(
    id: StickyNote['id'],
    input: StickyNotePatch,
  ): Promise<StickyNote | undefined> {
    const key = entityKey(id)
    const previous = itemsById.value[key]
    if (previous === undefined || mutationPendingIds.value.has(key)) {
      return undefined
    }

    mutationPendingIds.value.add(key)
    itemsById.value = { ...itemsById.value, [key]: optimisticPatch(previous, input) }
    try {
      const note = await updateStickyNote(id, input)
      itemsById.value = { ...itemsById.value, [key]: note }
      return note
    } catch (error: unknown) {
      // 只回滚当前卡片，避免覆盖其他卡片并发完成的成功修改。
      itemsById.value = { ...itemsById.value, [key]: previous }
      throw error
    } finally {
      mutationPendingIds.value.delete(key)
    }
  }

  async function togglePin(id: StickyNote['id']): Promise<StickyNote | undefined> {
    const note = byId.value(id)
    if (note === undefined) {
      return undefined
    }
    return await update(id, { is_pinned: !note.is_pinned })
  }

  async function archive(id: StickyNote['id']): Promise<StickyNote | undefined> {
    return await update(id, { is_archived: true })
  }

  async function restore(id: StickyNote['id']): Promise<StickyNote | undefined> {
    return await update(id, { is_archived: false })
  }

  async function remove(id: StickyNote['id']): Promise<boolean> {
    const key = entityKey(id)
    const previous = itemsById.value[key]
    if (previous === undefined || mutationPendingIds.value.has(key)) {
      return false
    }

    mutationPendingIds.value.add(key)
    const previousIndex = ids.value.indexOf(key)
    itemsById.value = Object.fromEntries(
      Object.entries(itemsById.value).filter(([id]) => id !== key),
    )
    ids.value = ids.value.filter((itemId) => itemId !== key)
    try {
      await removeStickyNote(id)
      pagination.value.count = Math.max(0, pagination.value.count - 1)
      return true
    } catch (error: unknown) {
      itemsById.value = { ...itemsById.value, [key]: previous }
      const nextIds = [...ids.value]
      nextIds.splice(previousIndex, 0, key)
      ids.value = nextIds
      throw error
    } finally {
      mutationPendingIds.value.delete(key)
    }
  }

  /**
   * 把请求顺序合并进「未归档全集」。
   *
   * 后端只接受该用户全部未归档便签的完整顺序，因此请求里被筛选隐藏的便签
   * 保持原有槽位，请求中的便签按请求顺序填入这些槽位，保证上送的
   * `ordered_ids` 完整、无重复、无遗漏。
   */
  function mergeIntoUnarchived(requested: readonly number[]): number[] {
    const fullIds = ordered.value.filter((note) => !note.is_archived).map((note) => note.id)
    const inScope = new Set(fullIds)
    const requestedInScope = [...new Set(requested)].filter((id) => inScope.has(id))
    if (requestedInScope.length === 0) {
      return fullIds
    }
    const remaining = [...requestedInScope]
    const requestedSet = new Set(requestedInScope)
    return fullIds
      .map((id) => (requestedSet.has(id) ? remaining.shift() : id))
      .filter((id) => id !== undefined)
  }

  async function reorder(requestedIds: number[]): Promise<boolean> {
    if (mutationPendingIds.value.has(REORDER_PENDING_KEY)) {
      return false
    }

    const orderedIds = mergeIntoUnarchived(requestedIds)
    if (requestedIds.length === 0 || orderedIds.length === 0) {
      return false
    }

    const previousIds = [...ids.value]
    const previousItems = { ...itemsById.value }
    const positions = new Map(orderedIds.map((id, index) => [id, index]))
    mutationPendingIds.value.add(REORDER_PENDING_KEY)
    const orderedKeys = orderedIds.map(entityKey)
    ids.value = [...orderedKeys, ...ids.value.filter((id) => !positions.has(Number(id)))]
    itemsById.value = Object.fromEntries(
      Object.entries(itemsById.value).map(([key, note]) => {
        const position = positions.get(note.id)
        return [key, position === undefined ? note : { ...note, position }]
      }),
    )
    try {
      await reorderStickyNotes(orderedIds)
      return true
    } catch (error: unknown) {
      ids.value = previousIds
      itemsById.value = previousItems
      throw error
    } finally {
      mutationPendingIds.value.delete(REORDER_PENDING_KEY)
    }
  }

  async function convertToTodo(
    id: StickyNote['id'],
    input: ConvertStickyNoteInput = {},
  ): Promise<ConvertStickyNoteResult | undefined> {
    const key = entityKey(id)
    if (itemsById.value[key] === undefined || mutationPendingIds.value.has(key)) {
      return undefined
    }

    mutationPendingIds.value.add(key)
    try {
      const result = await convertStickyNote(id, input)
      itemsById.value = { ...itemsById.value, [key]: result.sticky_note }
      todosById.value = { ...todosById.value, [entityKey(result.todo.id)]: result.todo }
      return result
    } finally {
      mutationPendingIds.value.delete(key)
    }
  }

  return {
    itemsById,
    ids,
    filters,
    pagination,
    listRequest,
    editingId,
    mutationPendingIds,
    todosById,
    ordered,
    visible,
    pinned,
    archived,
    recent,
    byId,
    fetchList,
    create,
    update,
    togglePin,
    archive,
    restore,
    remove,
    reorder,
    convertToTodo,
    upsertMany,
  }
})
