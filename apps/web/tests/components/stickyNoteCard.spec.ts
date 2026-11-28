import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'

import StickyNoteCard from '@/components/sticky-notes/StickyNoteCard.vue'

import { copyStickyNoteFixtures } from '../fixtures/entities'
import { at } from '../utils/data'

const fixtures = copyStickyNoteFixtures()
const pinned = at(fixtures, 0)
const plain = at(fixtures, 1)
const archived = at(fixtures, 2)

describe('StickyNoteCard', () => {
  it('按参考图展示置顶文字、正文、标签和可访问操作名称', async () => {
    const wrapper = mount(StickyNoteCard, {
      props: { note: pinned, index: 1, total: 3 },
    })

    expect(wrapper.text()).toContain('本周采购')
    expect(wrapper.text()).toContain('牛奶、鸡蛋、燕麦')
    expect(wrapper.text()).toContain('置顶')
    expect(wrapper.text()).toContain('家庭')
    expect(wrapper.find('.sticky-note-card-header').exists()).toBe(true)
    expect(wrapper.find('[aria-label="编辑便签“本周采购”"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="拖动便签“本周采购”排序"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="上移便签“本周采购”"]').exists()).toBe(true)
    expect(wrapper.find('[aria-label="下移便签“本周采购”"]').exists()).toBe(true)
    expect(wrapper.find('.sticky-note-card-status .sticky-note-pin-icon').exists()).toBe(true)
    expect(wrapper.find('[aria-label="取消置顶便签“本周采购”"]').classes()).toContain(
      'sticky-note-pin-button',
    )
    await wrapper.find('[data-test="sticky-note-edit-1"]').trigger('click')
    await wrapper.find('[data-test="sticky-note-convert"]').trigger('click')
    await wrapper.find('[aria-label="取消置顶便签“本周采购”"]').trigger('click')
    await wrapper.find('[aria-label="归档便签“本周采购”"]').trigger('click')
    await wrapper.find('[aria-label="上移便签“本周采购”"]').trigger('click')
    await wrapper.find('[aria-label="下移便签“本周采购”"]').trigger('click')

    expect(wrapper.emitted('edit')).toEqual([[pinned]])
    expect(wrapper.emitted('convert')).toEqual([[pinned]])
    expect(wrapper.emitted('togglePin')).toEqual([[pinned]])
    expect(wrapper.emitted('archive')).toEqual([[pinned]])
    expect(wrapper.emitted('move')).toEqual([
      [1, -1],
      [1, 1],
    ])
  })

  it('未置顶未归档的便签不渲染状态行并将编辑区置为首项，首项与末项禁用对应移动操作', async () => {
    const note = { ...plain, content: '', tags: [] }
    const first = mount(StickyNoteCard, { props: { note, index: 0, total: 2 } })
    expect(first.find('.sticky-note-card-header').exists()).toBe(false)
    expect(first.find('.sticky-note-card-status').exists()).toBe(false)
    expect(first.find('.sticky-note-card > :first-child').classes()).toContain(
      'sticky-note-card-edit',
    )
    expect(first.find('[data-test="sticky-note-drag-2"]').attributes('disabled')).toBeUndefined()
    expect(first.find('.sticky-note-card-content').exists()).toBe(false)
    expect(first.find('[aria-label="上移便签“维修电话”"]').attributes('disabled')).toBeDefined()
    expect(first.find('[aria-label="置顶便签“维修电话”"]').classes()).toContain(
      'sticky-note-pin-button',
    )
    await first.find('[aria-label="置顶便签“维修电话”"]').trigger('click')
    expect(first.emitted('togglePin')).toEqual([[note]])

    const last = mount(StickyNoteCard, { props: { note, index: 1, total: 2, busy: true } })
    expect(last.find('[aria-label="下移便签“维修电话”"]').attributes('disabled')).toBeDefined()
    expect(last.find('[data-test="sticky-note-convert"]').attributes('disabled')).toBeDefined()
  })

  it('归档便签显示图标文字、无标题回退与恢复操作', async () => {
    const wrapper = mount(StickyNoteCard, {
      props: { note: archived, index: 0, total: 1 },
    })

    expect(wrapper.text()).toContain('无标题便签')
    expect(wrapper.text()).toContain('已归档')
    expect(wrapper.find('.sticky-note-card-header').exists()).toBe(true)
    expect(wrapper.find('.sticky-note-card-status .sticky-note-pin-icon').exists()).toBe(false)
    await wrapper.find('[aria-label="恢复便签“无标题便签”"]').trigger('click')
    expect(wrapper.emitted('restore')).toEqual([[archived]])
  })
})
