import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/errors'
import type { Tag, TagInput } from '@/api/tags'
import { useTagsStore } from '@/stores/tags'

import { tagFixtures } from '../fixtures/entities'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/api/tags', () => ({
  list: mocks.list,
  create: mocks.create,
  update: mocks.update,
  remove: mocks.remove,
}))

function deferred<T>() {
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

function fixtureCopies(): Tag[] {
  return tagFixtures.map((tag) => ({ ...tag }))
}

beforeEach(() => {
  setActivePinia(createPinia())
  mocks.list.mockReset()
  mocks.create.mockReset()
  mocks.update.mockReset()
  mocks.remove.mockReset()
  mocks.list.mockResolvedValue(fixtureCopies())
})

describe('tags store', () => {
  it('加载成功后规范化实体并派生顺序、查询和选项', async () => {
    const store = useTagsStore()

    await store.fetchAll()

    expect(mocks.list).toHaveBeenCalledTimes(1)
    expect(store.ids).toEqual(['1', '2'])
    expect(store.ordered.map((tag) => tag.name)).toEqual(['家庭', '工作'])
    expect(store.byId(2)).toMatchObject({ name: '工作', color: '#1867C0' })
    expect(store.options).toEqual([
      { title: '家庭', value: 1, tag: tagFixtures[0] },
      { title: '工作', value: 2, tag: tagFixtures[1] },
    ])
    expect(store.listRequest.status).toBe('success')
    expect(store.listRequest.lastLoadedAt).not.toBeNull()
  })

  it('顺序索引含缺失实体时跳过该项', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    store.itemsById = { '1': { ...tagFixtures[0] } }

    expect(store.ordered).toEqual([tagFixtures[0]])
  })

  it('已加载列表再次请求时使用 refreshing 状态', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    const request = deferred<Tag[]>()
    mocks.list.mockReturnValueOnce(request.promise)

    const refreshing = store.fetchAll()
    expect(store.listRequest.status).toBe('refreshing')

    request.resolve(fixtureCopies())
    await refreshing
    expect(store.listRequest.status).toBe('success')
  })

  it('列表失败时保留统一错误并允许后续重试', async () => {
    const store = useTagsStore()
    mocks.list.mockRejectedValueOnce(apiError('网络不可用'))

    await expect(store.fetchAll()).rejects.toMatchObject({ message: '网络不可用' })
    expect(store.listRequest.status).toBe('error')
    expect(store.listRequest.error?.message).toBe('网络不可用')

    await store.fetchAll()
    expect(store.listRequest.status).toBe('success')
    expect(store.listRequest.error).toBeNull()
  })

  it('新建先写入临时实体，成功后替换为服务端实体，并拦截重复提交', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    const request = deferred<Tag>()
    mocks.create.mockReturnValue(request.promise)
    const input: TagInput = { name: '阅读', color: '#217A46' }
    const response: Tag = {
      id: 3,
      ...input,
      created_at: '2026-11-28T08:00:00Z',
      updated_at: '2026-11-28T08:00:00Z',
    }

    const first = store.create(input)
    expect(store.ordered[0]).toMatchObject({ name: '阅读', color: '#217A46' })
    expect(store.ordered[0]?.id).toBeLessThan(0)
    expect(store.mutationPendingIds.has('create')).toBe(true)

    await expect(store.create(input)).resolves.toBeUndefined()
    expect(mocks.create).toHaveBeenCalledTimes(1)

    request.resolve(response)
    await expect(first).resolves.toEqual(response)
    expect(store.ids).toEqual(['3', '1', '2'])
    expect(store.byId(3)).toEqual(response)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('新建失败时恢复创建前快照', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    const before = { itemsById: { ...store.itemsById }, ids: [...store.ids] }
    mocks.create.mockRejectedValue(apiError('创建失败'))

    await expect(
      store.create({ name: '阅读', color: '#217A46' }),
    ).rejects.toMatchObject({ message: '创建失败' })

    expect(store.itemsById).toEqual(before.itemsById)
    expect(store.ids).toEqual(before.ids)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('更新成功后采用服务端时间戳，pending 期间同一标签不能重复更新', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    const request = deferred<Tag>()
    mocks.update.mockReturnValue(request.promise)
    const response: Tag = {
      ...tagFixtures[0],
      name: '家庭生活',
      updated_at: '2026-11-28T09:00:00Z',
    }

    const first = store.update(1, { name: '家庭生活' })
    expect(store.byId(1)?.name).toBe('家庭生活')
    await expect(store.update(1, { name: '再次修改' })).resolves.toBeUndefined()
    expect(mocks.update).toHaveBeenCalledTimes(1)
    expect(mocks.update).toHaveBeenCalledWith(1, { name: '家庭生活' })

    request.resolve(response)
    await expect(first).resolves.toEqual(response)
    expect(store.byId(1)).toEqual(response)
    expect(store.mutationPendingIds.has('1')).toBe(false)
  })

  it('更新失败时恢复名称、颜色与完整列表快照', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    const before = { itemsById: { ...store.itemsById }, ids: [...store.ids] }
    mocks.update.mockRejectedValue(apiError('保存失败'))

    await expect(store.update(1, { name: '失败名称', color: '#5E35B1' })).rejects.toMatchObject({
      message: '保存失败',
    })

    expect(store.itemsById).toEqual(before.itemsById)
    expect(store.ids).toEqual(before.ids)
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('删除成功后移除实体，并阻止 pending 期间重复删除', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    const request = deferred<undefined>()
    mocks.remove.mockReturnValue(request.promise)

    const first = store.remove(1)
    expect(store.byId(1)).toBeUndefined()
    await expect(store.remove(1)).resolves.toBe(false)
    expect(mocks.remove).toHaveBeenCalledTimes(1)

    request.resolve(undefined)
    await expect(first).resolves.toBe(true)
    expect(store.ids).toEqual(['2'])
    expect(store.mutationPendingIds.size).toBe(0)
  })

  it('删除失败时恢复原位置和实体快照', async () => {
    const store = useTagsStore()
    await store.fetchAll()
    const before = { itemsById: { ...store.itemsById }, ids: [...store.ids] }
    mocks.remove.mockRejectedValue(apiError('删除失败'))

    await expect(store.remove(1)).rejects.toMatchObject({ message: '删除失败' })

    expect(store.itemsById).toEqual(before.itemsById)
    expect(store.ids).toEqual(before.ids)
    expect(store.mutationPendingIds.size).toBe(0)
  })
})
