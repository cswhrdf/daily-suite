import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { StickyNote } from '@/api/stickyNotes'
import StickyNoteCard from '@/components/sticky-notes/StickyNoteCard.vue'
import StickyNoteMasonry from '@/components/sticky-notes/StickyNoteMasonry.vue'

import { copyStickyNoteFixtures } from '../fixtures/entities'
import { at } from '../utils/data'

const mocks = vi.hoisted(() => ({
  lgAndUp: false,
  mdAndUp: false,
  smAndDown: true,
  xlAndUp: false,
}))

vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vuetify')>()
  const { ref } = await import('vue')
  // 真实 `useDisplay` 返回布尔 Ref，组件内部按 `.value` 读取；替身也返回 Ref，
  // 每个实例挂载时按当前 mock 值生成，避免与响应式实现不一致。
  return {
    ...actual,
    useDisplay: () => ({
      lgAndUp: ref(mocks.lgAndUp),
      mdAndUp: ref(mocks.mdAndUp),
      smAndDown: ref(mocks.smAndDown),
      xlAndUp: ref(mocks.xlAndUp),
    }),
  }
})

const notes = copyStickyNoteFixtures()

/** 拖拽容器替身：保留列容器与禁用状态，避开真实 Sortable 的 DOM 测量。 */
const draggableStub = {
  name: 'VueDraggable',
  props: ['modelValue', 'disabled'],
  template: '<div class="sticky-note-masonry-column"><slot /></div>',
}

function mountMasonry(): ReturnType<typeof mount> {
  return mount(StickyNoteMasonry, {
    props: { notes, pendingIds: new Set<string>() },
    global: { stubs: { VueDraggable: draggableStub } },
  })
}

beforeEach(() => {
  mocks.lgAndUp = false
  mocks.mdAndUp = false
  mocks.smAndDown = true
  mocks.xlAndUp = false
})

describe('StickyNoteMasonry', () => {
  it('按 xs/md/lg/xl 与中间断点分配 1/2/3/5/2 列', () => {
    /** 每次按新断点重新挂载，读列数后立即卸载，避免实例间相互干扰。 */
    const columnCountWith = (display: Partial<typeof mocks>): number => {
      Object.assign(
        mocks,
        { lgAndUp: false, mdAndUp: false, smAndDown: true, xlAndUp: false },
        display,
      )
      const wrapper = mountMasonry()
      const count = wrapper.findAll('.sticky-note-masonry-column').length
      wrapper.unmount()
      return count
    }

    expect(columnCountWith({})).toBe(1)
    expect(columnCountWith({ mdAndUp: true, smAndDown: false })).toBe(2)
    expect(columnCountWith({ lgAndUp: true, mdAndUp: true, smAndDown: false })).toBe(3)
    expect(columnCountWith({ lgAndUp: true, mdAndUp: true, smAndDown: false, xlAndUp: true })).toBe(
      5,
    )
    expect(columnCountWith({ smAndDown: false })).toBe(2)
  })

  it('拖拽结束发出跨列后的完整 orderedIds', async () => {
    const wrapper = mountMasonry()
    const exposed = wrapper.vm as unknown as {
      columns: { notes: StickyNote[] }[]
      emitCurrentOrder: () => void
      distribute: () => void
    }
    exposed.columns = [{ notes: [at(notes, 1)] }, { notes: [at(notes, 0), at(notes, 2)] }]
    await nextTick()
    wrapper.findComponent(VueDraggable).vm.$emit('end')
    exposed.emitCurrentOrder()

    expect(wrapper.emitted('reorder')).toEqual([[[2, 1, 3]], [[2, 1, 3]]])
  })

  it('拖拽容器回写列内顺序', async () => {
    const wrapper = mountMasonry()
    const exposed = wrapper.vm as unknown as { columns: { notes: StickyNote[] }[] }

    wrapper.findComponent(VueDraggable).vm.$emit('update:modelValue', [at(notes, 0)])
    await nextTick()
    expect(exposed.columns[0]?.notes).toEqual([at(notes, 0)])
  })

  it('上移下移交换扁平顺序，越界和未知 ID 不发出事件', () => {
    mocks.mdAndUp = true
    const wrapper = mountMasonry()
    const exposed = wrapper.vm as unknown as { move: (id: number, direction: -1 | 1) => void }

    exposed.move(2, -1)
    exposed.move(2, 1)
    exposed.move(999, 1)
    exposed.move(1, -1)
    exposed.move(3, 1)
    expect(wrapper.emitted('reorder')).toEqual([[[2, 1, 3]], [[1, 3, 2]]])

    const cards = wrapper.findAllComponents(StickyNoteCard)
    cards[1]?.vm.$emit('move', 2, -1)
    expect(wrapper.emitted('reorder')).toHaveLength(3)
  })

  it('转发卡片操作并合并单卡与全局排序 pending 状态', () => {
    const wrapper = mount(StickyNoteMasonry, {
      props: { notes: [at(notes, 0)], pendingIds: new Set(['1', 'reorder']) },
      global: { stubs: { VueDraggable: draggableStub } },
    })
    const card = wrapper.findComponent(StickyNoteCard)
    const note = at(notes, 0)
    expect(card.props('busy')).toBe(true)

    card.vm.$emit('archive', note)
    card.vm.$emit('convert', note)
    card.vm.$emit('edit', note)
    card.vm.$emit('restore', note)
    card.vm.$emit('togglePin', note)
    expect(wrapper.emitted('archive')).toEqual([[note]])
    expect(wrapper.emitted('convert')).toEqual([[note]])
    expect(wrapper.emitted('edit')).toEqual([[note]])
    expect(wrapper.emitted('restore')).toEqual([[note]])
    expect(wrapper.emitted('togglePin')).toEqual([[note]])
  })

  it('排序关闭时禁用拖拽、隐藏手柄并展示提示', () => {
    const wrapper = mount(StickyNoteMasonry, {
      props: {
        notes: [at(notes, 0)],
        pendingIds: new Set<string>(),
        sortable: false,
        hint: '筛选状态下不可拖拽排序',
      },
      global: { stubs: { VueDraggable: draggableStub } },
    })

    expect(wrapper.findComponent(VueDraggable).props('disabled')).toBe(true)
    expect(wrapper.find('[data-test="sticky-note-reorder-hint"]').text()).toContain(
      '筛选状态下不可拖拽排序',
    )
    expect(wrapper.find('[data-test="sticky-note-drag-1"]').exists()).toBe(false)
  })
})
