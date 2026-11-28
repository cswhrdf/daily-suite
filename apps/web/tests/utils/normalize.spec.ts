import { describe, expect, it } from 'vitest'

import { createRequestState } from '@/types/request'
import { ids, itemsById, mutationPendingIds } from '@/utils/normalize'
import { noteFixtures } from '../fixtures/entities'

const keyFn = (entity: { id: string }) => entity.id

describe('规范化工具', () => {
  it('itemsById 按 ID 索引实体，ids 保留输入顺序', () => {
    const indexed = itemsById(noteFixtures, keyFn)

    expect(indexed).toEqual({
      'note-2': noteFixtures[0],
      'note-1': noteFixtures[1],
    })
    expect(ids(noteFixtures, keyFn)).toEqual(['note-2', 'note-1'])
  })

  it('空输入产生空结果，重复键保留最后一个实体', () => {
    const duplicate: { id: string; title: string } = { id: 'note-1', title: '更新后的便签' }

    expect(itemsById([], keyFn)).toEqual({})
    expect(ids([], keyFn)).toEqual([])
    expect(itemsById([...noteFixtures, duplicate], keyFn)['note-1']).toEqual(duplicate)
    expect(ids([...noteFixtures, duplicate], keyFn)).toEqual(['note-2', 'note-1', 'note-1'])
  })

  it('mutationPendingIds 用 Set 追踪提交开始与结束', () => {
    const pending = mutationPendingIds(['note-1'])

    expect(pending.has('note-1')).toBe(true)
    pending.add('note-2')
    expect(pending.has('note-2')).toBe(true)
    pending.delete('note-1')
    expect(pending.has('note-1')).toBe(false)
    expect([...pending]).toEqual(['note-2'])
  })
})

describe('RequestState', () => {
  it('初始状态为 idle，且每次创建的对象互相独立', () => {
    const first = createRequestState()
    const second = createRequestState()

    expect(first).toEqual({ status: 'idle', error: null, lastLoadedAt: null })
    first.status = 'success'
    first.lastLoadedAt = 123
    expect(second).toEqual({ status: 'idle', error: null, lastLoadedAt: null })
  })
})
