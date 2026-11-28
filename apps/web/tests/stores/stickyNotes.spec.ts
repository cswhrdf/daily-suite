import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/errors'
import type { StickyNote, StickyNoteInput } from '@/api/stickyNotes'
import { DEFAULT_STICKY_NOTE_FILTERS, useStickyNotesStore } from '@/stores/stickyNotes'
import { useTagsStore } from '@/stores/tags'

import { copyStickyNoteFixtures, tagFixtures, tagSummaryFixtures } from '../fixtures/entities'
import { at, required } from '../utils/data'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
  convertToTodo: vi.fn(),
}))

vi.mock('@/api/stickyNotes', () => ({
  list: mocks.list,
  create: mocks.create,
  update: mocks.update,
  remove: mocks.remove,
  reorder: mocks.reorder,
  convertToTodo: mocks.convertToTodo,
}))

function deferred<T>(): {
  promise: Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
} {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function apiError(message: string): ApiError {
  return new ApiError('network', 'apiErrors.network', message, null)
}

async function loadedStore(): Promise<ReturnType<typeof useStickyNotesStore>> {
  const store = useStickyNotesStore()
  await store.fetchList()
  return store
}

const input: StickyNoteInput = {
  title: '灵感',
  content: '保留这个念头',
  color: '#F3F0ED',
  tag_ids: [1, 99],
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.list.mockReset()
  mocks.create.mockReset()
  mocks.update.mockReset()
  mocks.remove.mockReset()
  mocks.reorder.mockReset()
  mocks.convertToTodo.mockReset()
  mocks.list.mockResolvedValue(copyStickyNoteFixtures())
  const tagsStore = useTagsStore()
  tagsStore.itemsById = Object.fromEntries(tagFixtures.map((tag) => [String(tag.id), { ...tag }]))
  tagsStore.ids = tagFixtures.map((tag) => String(tag.id))
})

describe('sticky notes store', () => {
  it('规范化列表并派生筛选、置顶、归档、最近、查询和分页状态', async () => {
    const store = await loadedStore()

    expect(store.ids).toEqual(['1', '2', '3'])
    expect(store.visible.map((note) => note.id)).toEqual([1, 2])
    expect(store.pinned.map((note) => note.id)).toEqual([1])
    expect(store.archived.map((note) => note.id)).toEqual([3])
    expect(store.recent.map((note) => note.id)).toEqual([2, 1])
    expect(store.byId(2)?.title).toBe('维修电话')
    expect(store.pagination).toEqual({ count: 3, next: null, previous: null })
    expect(store.listRequest.status).toBe('success')
    expect(store.listRequest.lastLoadedAt).not.toBeNull()

    store.filters = { tag: 1, search: '牛奶', is_archived: false, ordering: 'position' }
    expect(store.visible.map((note) => note.id)).toEqual([1])
    store.filters = { ...store.filters, tag: 2 }
    expect(store.visible).toEqual([])
    store.filters = { ...store.filters, tag: null, search: '没有匹配' }
    expect(store.visible).toEqual([])
    store.filters = { ...store.filters, search: '', is_archived: true }
    expect(store.visible.map((note) => note.id)).toEqual([3])
  })

  it('列表请求只带归档范围与排序，标签与搜索留在本地过滤', async () => {
    const store = useStickyNotesStore()
    await store.fetchList({ tag: 2, search: ' 维修 ', is_archived: false, ordering: 'position' })

    // 后端重排要求完整未归档集合，标签与搜索若下推到服务端会破坏该契约。
    expect(mocks.list).toHaveBeenCalledWith({
      tag: null,
      search: '',
      is_archived: false,
      ordering: 'position',
    })
    expect(store.visible.map((note) => note.id)).toEqual([2])
  })

  it('筛选态重排仍提交未归档全集，被隐藏的便签保持原槽位', async () => {
    const store = await loadedStore()
    await store.fetchList({ ...DEFAULT_STICKY_NOTE_FILTERS, tag: 1 })
    mocks.reorder.mockResolvedValue(undefined)

    await expect(store.reorder([1])).resolves.toBe(true)
    expect(mocks.reorder).toHaveBeenCalledWith([1, 2])
  })

  it('顺序索引缺实体时跳过，upsertMany 合并新实体并替换已有实体', async () => {
    const store = await loadedStore()
    const stored = required(store.byId(1), '便签 1')
    store.itemsById = { '1': stored }
    expect(store.ordered.map((note) => note.id)).toEqual([1])

    const replacement = { ...stored, title: '替换' }
    const added = { ...stored, id: 4, title: '新增' }
    store.upsertMany([replacement, added])
    expect(store.byId(1)?.title).toBe('替换')
    expect(store.ids).toEqual(['1', '2', '3', '4'])
    store.upsertMany([{ ...added, title: '再次替换' }])
    expect(store.ids).toEqual(['1', '2', '3', '4'])
  })

  it('已有数据时刷新显示 refreshing，失败保留统一错误并允许重试', async () => {
    const store = await loadedStore()
    const request = deferred<StickyNote[]>()
    mocks.list.mockReturnValueOnce(request.promise)
    const refreshing = store.fetchList(DEFAULT_STICKY_NOTE_FILTERS)
    expect(store.listRequest.status).toBe('refreshing')
    request.resolve(copyStickyNoteFixtures())
    await refreshing

    mocks.list.mockRejectedValueOnce(apiError('加载失败'))
    await expect(store.fetchList()).rejects.toMatchObject({ message: '加载失败' })
    expect(store.listRequest.status).toBe('error')
    expect(store.listRequest.error?.message).toBe('加载失败')

    await store.fetchList()
    expect(store.listRequest.status).toBe('success')
    expect(store.listRequest.error).toBeNull()
  })

  it('请求序号阻止旧响应和旧错误覆盖新筛选结果', async () => {
    const store = useStickyNotesStore()
    const oldRequest = deferred<StickyNote[]>()
    const newRequest = deferred<StickyNote[]>()
    mocks.list.mockReturnValueOnce(oldRequest.promise).mockReturnValueOnce(newRequest.promise)
    const oldFilters = { ...DEFAULT_STICKY_NOTE_FILTERS, search: '旧' }
    const newFilters = { ...DEFAULT_STICKY_NOTE_FILTERS, search: '新' }

    const oldFetch = store.fetchList(oldFilters)
    const newFetch = store.fetchList(newFilters)
    newRequest.resolve([at(copyStickyNoteFixtures(), 1)])
    await newFetch
    oldRequest.resolve(copyStickyNoteFixtures())
    await oldFetch
    expect(store.filters.search).toBe('新')
    expect(store.ids).toEqual(['2'])

    const failedOldRequest = deferred<StickyNote[]>()
    const latestRequest = deferred<StickyNote[]>()
    mocks.list
      .mockReturnValueOnce(failedOldRequest.promise)
      .mockReturnValueOnce(latestRequest.promise)
    const failedFetch = store.fetchList(oldFilters)
    const latestFetch = store.fetchList(newFilters)
    latestRequest.resolve([at(copyStickyNoteFixtures(), 0)])
    await latestFetch
    failedOldRequest.reject(apiError('旧请求失败'))
    await expect(failedFetch).resolves.toBeUndefined()
    expect(store.listRequest.status).toBe('success')
    expect(store.listRequest.error).toBeNull()
  })

  it('乐观新建替换临时实体，拦截重复提交并保留已有标签摘要', async () => {
    const store = await loadedStore()
    const request = deferred<StickyNote>()
    mocks.create.mockReturnValue(request.promise)
    const response: StickyNote = {
      ...at(copyStickyNoteFixtures(), 0),
      id: 4,
      title: input.title,
      content: input.content,
      color: input.color,
      is_pinned: false,
      position: -1,
    }

    const firstCreate = store.create(input)
    expect(store.ids[0]).toBe('-1')
    expect(store.byId(-1)?.tags).toEqual([tagSummaryFixtures[0]])
    expect(store.byId(-1)?.position).toBe(-1)
    expect(store.mutationPendingIds.has('create')).toBe(true)
    await expect(store.create(input)).resolves.toBeUndefined()
    expect(mocks.create).toHaveBeenCalledTimes(1)

    request.resolve(response)
    await expect(firstCreate).resolves.toEqual(response)
    expect(store.ids[0]).toBe('4')
    expect(store.byId(-1)).toBeUndefined()
    expect(store.byId(4)).toEqual(response)
    expect(store.pagination.count).toBe(4)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('空列表新建使用默认位置，失败后只移除临时卡片', async () => {
    const store = useStickyNotesStore()
    await store.fetchList({ ...DEFAULT_STICKY_NOTE_FILTERS })
    store.itemsById = {}
    store.ids = []
    mocks.create.mockRejectedValue(apiError('创建失败'))

    const creating = store.create(input)
    expect(store.byId(-1)?.position).toBe(-1)
    await expect(creating).rejects.toMatchObject({ message: '创建失败' })
    expect(store.ids).toEqual([])
    expect(store.itemsById).toEqual({})
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('更新成功采用服务端实体并拦截重复或未知实体更新', async () => {
    const store = await loadedStore()
    const request = deferred<StickyNote>()
    mocks.update.mockReturnValue(request.promise)
    const response = { ...at(copyStickyNoteFixtures(), 0), title: '服务端标题' }

    const updating = store.update(1, { ...input, is_pinned: false })
    expect(store.byId(1)?.title).toBe('灵感')
    expect(store.byId(1)?.tags).toEqual([tagSummaryFixtures[0]])
    await expect(store.update(1, { title: '重复' })).resolves.toBeUndefined()
    await expect(store.update(999, { title: '不存在' })).resolves.toBeUndefined()
    request.resolve(response)
    await expect(updating).resolves.toEqual(response)
    expect(store.byId(1)).toEqual(response)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('更新标签字段未提供时保留原摘要，失败只回滚当前卡片', async () => {
    const store = await loadedStore()
    const firstRequest = deferred<StickyNote>()
    mocks.update.mockReturnValueOnce(firstRequest.promise).mockResolvedValueOnce({
      ...at(copyStickyNoteFixtures(), 1),
      title: '另一张已成功',
    })

    const failed = store.update(1, { title: '即将失败' })
    await store.update(2, { title: '另一张已成功' })
    firstRequest.reject(apiError('保存失败'))
    await expect(failed).rejects.toMatchObject({ message: '保存失败' })
    expect(store.byId(1)?.title).toBe('本周采购')
    expect(store.byId(2)?.title).toBe('另一张已成功')
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('置顶、归档和恢复复用局部更新，未知置顶直接返回', async () => {
    const store = await loadedStore()
    mocks.update.mockImplementation((id: number, patch: Partial<StickyNote>) =>
      Promise.resolve({
        ...required(store.byId(id), `便签 ${String(id)}`),
        ...patch,
      }),
    )

    await store.togglePin(1)
    await store.archive(2)
    await store.restore(3)
    await expect(store.togglePin(999)).resolves.toBeUndefined()
    expect(mocks.update).toHaveBeenNthCalledWith(1, 1, { is_pinned: false })
    expect(mocks.update).toHaveBeenNthCalledWith(2, 2, { is_archived: true })
    expect(mocks.update).toHaveBeenNthCalledWith(3, 3, { is_archived: false })
  })

  it('删除成功移除实体、拦截重复删除并更新计数', async () => {
    const store = await loadedStore()
    const request = deferred<undefined>()
    mocks.remove.mockReturnValue(request.promise)

    const removing = store.remove(1)
    expect(store.byId(1)).toBeUndefined()
    await expect(store.remove(1)).resolves.toBe(false)
    await expect(store.remove(999)).resolves.toBe(false)
    request.resolve(undefined)
    await expect(removing).resolves.toBe(true)
    expect(store.ids).toEqual(['2', '3'])
    expect(store.pagination.count).toBe(2)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('删除失败恢复原索引，计数不会小于零', async () => {
    const store = await loadedStore()
    mocks.remove.mockRejectedValueOnce(apiError('删除失败'))
    await expect(store.remove(2)).rejects.toMatchObject({ message: '删除失败' })
    expect(store.ids).toEqual(['1', '2', '3'])
    expect(store.byId(2)?.title).toBe('维修电话')

    store.pagination.count = 0
    mocks.remove.mockResolvedValueOnce(undefined)
    await store.remove(2)
    expect(store.pagination.count).toBe(0)
  })

  it('排序乐观更新完整位置，拦截重复提交，失败恢复唯一扁平顺序', async () => {
    const store = await loadedStore()
    const request = deferred<undefined>()
    mocks.reorder.mockReturnValueOnce(request.promise)

    const reordering = store.reorder([2, 1, 3])
    expect(store.ids).toEqual(['2', '1', '3'])
    expect(store.byId(3)?.position).toBe(2)
    await expect(store.reorder([3, 2, 1])).resolves.toBe(false)
    request.resolve(undefined)
    await expect(reordering).resolves.toBe(true)
    expect(mocks.reorder).toHaveBeenCalledTimes(1)

    mocks.reorder.mockRejectedValueOnce(apiError('排序失败'))
    await expect(store.reorder([3, 2, 1])).rejects.toMatchObject({ message: '排序失败' })
    expect(store.ids).toEqual(['2', '1', '3'])
    expect(store.byId(2)?.position).toBe(0)
    expect(store.byId(1)?.position).toBe(1)
    expect(store.byId(3)?.position).toBe(2)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('转换成功同时写入便签与待办并拦截重复提交', async () => {
    const store = await loadedStore()
    const request = deferred<{ sticky_note: StickyNote; todo: { id: number; title: string } }>()
    mocks.convertToTodo.mockReturnValue(request.promise)
    const result = {
      sticky_note: { ...at(copyStickyNoteFixtures(), 0), is_archived: true },
      todo: { id: 9, title: '本周采购' },
    }

    const converting = store.convertToTodo(1, { priority: 'high' })
    await expect(store.convertToTodo(1)).resolves.toBeUndefined()
    await expect(store.convertToTodo(999)).resolves.toBeUndefined()
    request.resolve(result)
    await expect(converting).resolves.toEqual(result)
    expect(store.byId(1)).toEqual(result.sticky_note)
    expect(store.todosById['9']).toEqual(result.todo)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('转换失败不写入待办且释放 pending', async () => {
    const store = await loadedStore()
    mocks.convertToTodo.mockRejectedValue(apiError('转换失败'))

    await expect(store.convertToTodo(1)).rejects.toMatchObject({ message: '转换失败' })
    expect(store.todosById).toEqual({})
    expect(store.byId(1)?.is_archived).toBe(false)
    expect(store.mutationPendingIds.size).toBe(0)
  })
})
