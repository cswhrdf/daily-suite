import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { convertToTodo, create, get, list, remove, reorder, update } from '@/api/stickyNotes'
import { DEFAULT_STICKY_NOTE_FILTERS } from '@/stores/stickyNotes'

import { stickyNoteFixtures } from '../fixtures/entities'
import { at } from '../utils/data'

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('@/api/http', () => ({
  default: {
    get: mocks.get,
    post: mocks.post,
    patch: mocks.patch,
    delete: mocks.delete,
  },
}))

const first = at(stickyNoteFixtures, 0)
const second = at(stickyNoteFixtures, 1)

beforeEach(() => {
  mocks.get.mockReset()
  mocks.post.mockReset()
  mocks.patch.mockReset()
  mocks.delete.mockReset()
})

describe('sticky notes api', () => {
  it('映射筛选参数并跟随 next 获取全部分页', async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: { count: 2, next: '/sticky-notes/?page=2', previous: null, results: [first] },
      })
      .mockResolvedValueOnce({
        data: { count: 2, next: null, previous: '/sticky-notes/', results: [second] },
      })

    await expect(
      list({ tag: 1, search: '  采购  ', is_archived: false, ordering: 'position' }),
    ).resolves.toEqual([first, second])
    expect(mocks.get).toHaveBeenNthCalledWith(1, '/sticky-notes/', {
      params: { tag: 1, search: '采购', is_archived: 'false', ordering: 'position' },
    })
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/sticky-notes/?page=2')
  })

  it('省略空标签与空白搜索参数', async () => {
    mocks.get.mockResolvedValue({
      data: { count: 0, next: null, previous: null, results: [] },
    })

    await list({ ...DEFAULT_STICKY_NOTE_FILTERS, search: '   ' })
    expect(mocks.get).toHaveBeenCalledWith('/sticky-notes/', {
      params: { is_archived: 'false', ordering: '-is_pinned,position' },
    })
  })

  it('访问带尾斜杠的详情、新建、更新、删除、排序和转换端点', async () => {
    const input = { title: '标题', content: '正文', color: '#FFF0D9' as const, tag_ids: [1] }
    const conversion = {
      sticky_note: { ...first, is_archived: true },
      todo: { id: 9, title: first.title },
    }
    mocks.get.mockResolvedValue({ data: first })
    mocks.post
      .mockResolvedValueOnce({ data: first })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ data: conversion })
    mocks.patch.mockResolvedValue({ data: { ...first, title: '更新' } })
    mocks.delete.mockResolvedValue({})

    await expect(get(1)).resolves.toEqual(first)
    await expect(create(input)).resolves.toEqual(first)
    await update(1, { title: '更新' })
    await remove(1)
    await reorder([2, 1])
    await expect(convertToTodo(1, { priority: 'high' })).resolves.toEqual(conversion)

    expect(mocks.get).toHaveBeenCalledWith('/sticky-notes/1/')
    expect(mocks.post).toHaveBeenNthCalledWith(1, '/sticky-notes/', input)
    expect(mocks.patch).toHaveBeenCalledWith('/sticky-notes/1/', { title: '更新' })
    expect(mocks.delete).toHaveBeenCalledWith('/sticky-notes/1/')
    expect(mocks.post).toHaveBeenNthCalledWith(2, '/sticky-notes/reorder/', {
      ordered_ids: [2, 1],
    })
    expect(mocks.post).toHaveBeenNthCalledWith(3, '/sticky-notes/1/convert-to-todo/', {
      priority: 'high',
    })
  })

  it('转换接口默认提交空对象', async () => {
    mocks.post.mockResolvedValue({
      data: { sticky_note: first, todo: { id: 9 } },
    })

    await convertToTodo(1)
    expect(mocks.post).toHaveBeenCalledWith('/sticky-notes/1/convert-to-todo/', {})
  })

  it('所有端点错误都统一转换为 ApiError', async () => {
    const error = new AxiosError('Network Error')
    mocks.get.mockRejectedValue(error)
    mocks.post.mockRejectedValue(error)
    mocks.patch.mockRejectedValue(error)
    mocks.delete.mockRejectedValue(error)

    await expect(list(DEFAULT_STICKY_NOTE_FILTERS)).rejects.toMatchObject({ kind: 'network' })
    await expect(get(1)).rejects.toMatchObject({ kind: 'network' })
    await expect(
      create({ title: '', content: '正文', color: '#FFF0D9', tag_ids: [] }),
    ).rejects.toMatchObject({ kind: 'network' })
    await expect(update(1, { title: '更新' })).rejects.toMatchObject({ kind: 'network' })
    await expect(remove(1)).rejects.toMatchObject({ kind: 'network' })
    await expect(reorder([1])).rejects.toMatchObject({ kind: 'network' })
    await expect(convertToTodo(1)).rejects.toMatchObject({ kind: 'network' })
  })
})
