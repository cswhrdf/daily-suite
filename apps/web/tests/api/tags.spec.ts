import { AxiosError } from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { create, list, remove, update } from '@/api/tags'

import { tagFixtures } from '../fixtures/entities'

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

beforeEach(() => {
  mocks.get.mockReset()
  mocks.post.mockReset()
  mocks.patch.mockReset()
  mocks.delete.mockReset()
})

describe('tags api', () => {
  it('使用共享 http 实例访问带尾斜杠的 CRUD 端点并解包分页列表', async () => {
    mocks.get.mockResolvedValue({
      data: { count: 2, next: null, previous: null, results: [...tagFixtures] },
    })
    mocks.post.mockResolvedValue({ data: tagFixtures[0] })
    mocks.patch.mockResolvedValue({ data: { ...tagFixtures[0], name: '家庭生活' } })
    mocks.delete.mockResolvedValue({})

    await expect(list()).resolves.toEqual([...tagFixtures])
    await create({ name: '家庭', color: '#C2410C' })
    await update(1, { name: '家庭生活' })
    await remove(1)

    expect(mocks.get).toHaveBeenCalledWith('/tags/')
    expect(mocks.post).toHaveBeenCalledWith('/tags/', { name: '家庭', color: '#C2410C' })
    expect(mocks.patch).toHaveBeenCalledWith('/tags/1/', { name: '家庭生活' })
    expect(mocks.delete).toHaveBeenCalledWith('/tags/1/')
  })

  it('跟随 next 读取全部分页', async () => {
    mocks.get
      .mockResolvedValueOnce({
        data: { count: 2, next: '/tags/?page=2', previous: null, results: [tagFixtures[0]] },
      })
      .mockResolvedValueOnce({
        data: { count: 2, next: null, previous: '/tags/', results: [tagFixtures[1]] },
      })

    await expect(list()).resolves.toEqual([...tagFixtures])
    expect(mocks.get).toHaveBeenNthCalledWith(2, '/tags/?page=2')
  })

  it('所有请求错误统一转换为 ApiError', async () => {
    mocks.get.mockRejectedValue(new AxiosError('Network Error'))

    await expect(list()).rejects.toMatchObject({
      kind: 'network',
      i18nKey: 'apiErrors.network',
      status: null,
    })
  })

  it('新建、更新和删除失败时也统一转换为 ApiError', async () => {
    mocks.post.mockRejectedValue(new AxiosError('Create failed'))
    mocks.patch.mockRejectedValue(new AxiosError('Update failed'))
    mocks.delete.mockRejectedValue(new AxiosError('Delete failed'))

    await expect(create({ name: '阅读', color: '#217A46' })).rejects.toMatchObject({
      kind: 'network',
    })
    await expect(update(1, { name: '家庭生活' })).rejects.toMatchObject({ kind: 'network' })
    await expect(remove(1)).rejects.toMatchObject({ kind: 'network' })
  })
})
