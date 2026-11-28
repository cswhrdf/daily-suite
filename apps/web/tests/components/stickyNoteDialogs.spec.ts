import { flushPromises, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VAutocomplete, VBtn, VCard, VDialog, VSelect } from 'vuetify/components'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ConvertStickyNoteDialog from '@/components/sticky-notes/ConvertStickyNoteDialog.vue'
import StickyNoteEditDialog from '@/components/sticky-notes/StickyNoteEditDialog.vue'

import { copyStickyNoteFixtures, tagFixtures } from '../fixtures/entities'
import { at } from '../utils/data'

const mocks = vi.hoisted(() => ({ smAndDown: false }))

vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vuetify')>()
  return { ...actual, useDisplay: () => ({ smAndDown: mocks.smAndDown }) }
})

const note = at(copyStickyNoteFixtures(), 0)

function setInput(selector: string, value: string): void {
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error(`找不到输入框：${selector}`)
  }
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

function inputValue(selector: string): string {
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLInputElement)) {
    throw new Error(`找不到输入框：${selector}`)
  }
  return element.value
}

async function click(selector: string): Promise<void> {
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`找不到元素：${selector}`)
  }
  element.click()
  await flushPromises()
}

beforeEach(() => {
  mocks.smAndDown = false
  document.body.innerHTML = ''
})

describe('StickyNoteEditDialog', () => {
  it('颜色按钮显示本地化颜色名，不在可见文字或无障碍名称中暴露 HEX', () => {
    const wrapper = mount(StickyNoteEditDialog, {
      props: { modelValue: true, note, tags: [...tagFixtures] },
      attachTo: document.body,
    })
    const options = [
      { hex: '#FFF0D9', label: '暖黄' },
      { hex: '#EAF3FF', label: '浅蓝' },
      { hex: '#EAF5EC', label: '浅绿' },
      { hex: '#F3F0ED', label: '中性灰' },
    ]

    // Vuetify 的对话框内容会被 teleport 到 body，需从 document 查询真实 DOM。
    for (const { hex, label } of options) {
      const button = document.querySelector(`[aria-label="使用便签颜色 ${label}"]`)
      if (!(button instanceof HTMLElement)) {
        throw new Error(`找不到颜色按钮：${label}`)
      }
      expect(button.textContent).toContain(label)
      expect(button.textContent).not.toContain(hex)
    }
    expect(document.body.textContent).not.toContain('#FFF0D9')
    expect(document.body.textContent).not.toContain('#EAF3FF')
    wrapper.unmount()
  })

  it('干净状态直接关闭，未保存关闭需确认并可继续编辑或放弃', async () => {
    const wrapper = mount(StickyNoteEditDialog, {
      props: { modelValue: true, note, tags: [...tagFixtures] },
      attachTo: document.body,
    })
    const exposed = wrapper.vm as unknown as {
      requestClose: () => void
      cancelDiscard: () => void
      confirmDiscard: () => void
    }

    exposed.requestClose()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])

    setInput('[data-test="sticky-note-edit-title"] input', '已修改')
    await nextTick()
    exposed.requestClose()
    await nextTick()
    expect(document.body.textContent).toContain('放弃未保存的修改？')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])

    exposed.cancelDiscard()
    await nextTick()
    expect(wrapper.findAllComponents(VDialog)[1]?.props('modelValue')).toBe(false)
    exposed.requestClose()
    exposed.confirmDiscard()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]])

    // 弹窗组件自身回写可见性时同样走确认 / 关闭逻辑。
    wrapper.findAllComponents(VDialog)[0]?.vm.$emit('update:modelValue', false)
    wrapper.findAllComponents(VDialog)[1]?.vm.$emit('update:modelValue', false)
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false], [false]])
    wrapper.unmount()
  })

  it('校验空内容并提交标题、正文、颜色和标签完整载荷', async () => {
    const empty = { ...note, title: '', content: '', tags: [] }
    const wrapper = mount(StickyNoteEditDialog, {
      props: { modelValue: true, note: empty, tags: [...tagFixtures] },
      attachTo: document.body,
    })
    const exposed = wrapper.vm as unknown as { submit: () => void; isDirty: boolean }

    exposed.submit()
    await nextTick()
    expect(document.body.textContent).toContain('标题和正文不能同时为空。')
    expect(wrapper.emitted('save')).toBeUndefined()

    setInput('[data-test="sticky-note-edit-title"] input', '  新标题  ')
    setInput('[data-test="sticky-note-edit-content"] textarea', '  新正文  ')
    await nextTick()
    const colors = wrapper.findAllComponents(VBtn)
    const blue = colors.find((button) => button.attributes('aria-label') === '使用便签颜色 浅蓝')
    expect(blue?.text()).toContain('浅蓝')
    await blue?.trigger('click')
    const autocomplete = wrapper.findComponent(VAutocomplete)
    autocomplete.vm.$emit('update:modelValue', [1, 2])
    await nextTick()
    exposed.submit()

    expect(exposed.isDirty).toBe(true)
    expect(wrapper.emitted('save')).toEqual([
      [1, { title: '新标题', content: '新正文', color: '#EAF3FF', tag_ids: [1, 2] }],
    ])
    wrapper.unmount()
  })

  it('保存中禁止关闭和重复提交，重开或换便签时重置表单', async () => {
    const wrapper = mount(StickyNoteEditDialog, {
      props: { modelValue: true, note, tags: [...tagFixtures], saving: true },
      attachTo: document.body,
    })
    const exposed = wrapper.vm as unknown as {
      requestClose: () => void
      submit: () => void
      reset: () => void
    }
    exposed.requestClose()
    exposed.submit()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('save')).toBeUndefined()
    expect(wrapper.findComponent(VDialog).props('persistent')).toBe(true)

    await wrapper.setProps({ saving: false, modelValue: false })
    setInput('[data-test="sticky-note-edit-title"] input', '未保存')
    await nextTick()
    exposed.reset()
    await wrapper.setProps({ modelValue: true })
    expect(inputValue('[data-test="sticky-note-edit-title"] input')).toBe(note.title)
    await wrapper.setProps({ note: { ...note, id: 2, title: '另一条' } })
    expect(inputValue('[data-test="sticky-note-edit-title"] input')).toBe('另一条')
    wrapper.unmount()
  })

  it('移动端使用全屏直角对话框', () => {
    mocks.smAndDown = true
    const wrapper = mount(StickyNoteEditDialog, {
      props: { modelValue: true, note, tags: [] },
      attachTo: document.body,
    })
    expect(wrapper.findComponent(VDialog).props('fullscreen')).toBe(true)
    expect(wrapper.findComponent(VCard).props('rounded')).toBe('0')
    wrapper.unmount()
  })
})

describe('ConvertStickyNoteDialog', () => {
  it('展示来源说明并提交可选截止时间与优先级', async () => {
    const wrapper = mount(ConvertStickyNoteDialog, {
      props: { modelValue: true, note, saving: false },
      attachTo: document.body,
    })

    expect(document.body.textContent).toContain(note.title)
    expect(document.body.textContent).toContain(note.content)
    setInput('[data-test="sticky-note-convert-due-at"] input', '2026-11-30T09:30')
    const select = wrapper.findComponent(VSelect)
    select.vm.$emit('update:modelValue', 'high')
    await nextTick()
    await click('[data-test="sticky-note-convert-confirm"]')

    expect(wrapper.emitted('confirm')).toEqual([
      [1, { due_at: new Date('2026-11-30T09:30').toISOString(), priority: 'high' }],
    ])
    wrapper.unmount()
  })

  it('无截止时间省略字段，空正文展示说明，关闭发出可见性事件', () => {
    const wrapper = mount(ConvertStickyNoteDialog, {
      props: { modelValue: true, note: { ...note, title: '', content: '' } },
      attachTo: document.body,
    })
    const exposed = wrapper.vm as unknown as { confirm: () => void; close: () => void }

    exposed.confirm()
    expect(wrapper.emitted('confirm')).toEqual([[1, { priority: 'medium' }]])
    expect(document.body.textContent).toContain('无标题便签')
    expect(document.body.textContent).toContain('来源便签没有正文。')
    exposed.close()
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('保存中禁止操作，重开重置输入，移动端全屏', async () => {
    mocks.smAndDown = true
    const wrapper = mount(ConvertStickyNoteDialog, {
      props: { modelValue: true, note, saving: true },
      attachTo: document.body,
    })
    const exposed = wrapper.vm as unknown as { confirm: () => void; close: () => void }
    exposed.confirm()
    exposed.close()
    expect(wrapper.emitted('confirm')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.findComponent(VDialog).props('fullscreen')).toBe(true)
    expect(wrapper.findComponent(VCard).props('rounded')).toBe('0')

    await wrapper.setProps({ saving: false, modelValue: false })
    await wrapper.setProps({ modelValue: true })
    await flushPromises()
    expect(wrapper.findComponent(VSelect).props('modelValue')).toBe('medium')

    wrapper.findComponent(VDialog).vm.$emit('update:modelValue', false)
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })
})
