import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { VAutocomplete, VTextField } from 'vuetify/components'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import StickyNoteQuickAdd from '@/components/sticky-notes/StickyNoteQuickAdd.vue'
import StickyNoteToolbar from '@/components/sticky-notes/StickyNoteToolbar.vue'
import TagFilterMenu from '@/components/tags/TagFilterMenu.vue'

import { tagFixtures } from '../fixtures/entities'

const mocks = vi.hoisted(() => ({ isMacPlatform: false, smAndDown: false }))

vi.mock('@/utils/platform', () => ({ isMacPlatform: () => mocks.isMacPlatform }))
vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vuetify')>()
  return { ...actual, useDisplay: () => ({ smAndDown: mocks.smAndDown }) }
})

function setInput(wrapper: ReturnType<typeof mount>, selector: string, value: string): void {
  const input = wrapper.find(selector)
  const element = input.element
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error(`找不到输入框：${selector}`)
  }
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  mocks.isMacPlatform = false
  mocks.smAndDown = false
})

describe('StickyNoteQuickAdd', () => {
  it('空白内容不提交并显示可读校验，输入后可提交完整载荷', async () => {
    const wrapper = mount(StickyNoteQuickAdd, {
      props: { tags: [...tagFixtures] },
    })

    await wrapper.find('form').trigger('submit')
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).toContain('标题和正文不能同时为空。')

    setInput(wrapper, '[data-test="sticky-note-quick-title"] input', '  临时标题  ')
    setInput(wrapper, '[data-test="sticky-note-quick-content"] textarea', '  临时正文  ')
    await wrapper.find('[data-test="sticky-note-color-#EAF3FF"]').trigger('click')
    const autocomplete = wrapper.findComponent(VAutocomplete)
    autocomplete.vm.$emit('update:modelValue', [2])
    await nextTick()
    await wrapper.find('form').trigger('submit')

    expect(wrapper.emitted('submit')).toEqual([
      [{ title: '临时标题', content: '临时正文', color: '#EAF3FF', tag_ids: [2] }],
    ])
  })

  it('标题普通 Enter 不提交也不显示校验，正文普通 Enter 保持默认换行行为', async () => {
    const wrapper = mount(StickyNoteQuickAdd, { props: { tags: [] } })
    const title = wrapper.find('[data-test="sticky-note-quick-title"] input')
    const titleEnter = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    })
    title.element.dispatchEvent(titleEnter)
    await nextTick()

    expect(titleEnter.defaultPrevented).toBe(true)
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.text()).not.toContain('标题和正文不能同时为空。')

    const content = wrapper.find('[data-test="sticky-note-quick-content"] textarea')
    const contentEnter = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter',
    })
    content.element.dispatchEvent(contentEnter)
    await nextTick()

    expect(contentEnter.defaultPrevented).toBe(false)
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('标题与正文的 Ctrl+Enter 和 Meta+Enter 均各提交一次完整载荷', async () => {
    const wrapper = mount(StickyNoteQuickAdd, { props: { tags: [] } })
    setInput(wrapper, '[data-test="sticky-note-quick-title"] input', '  临时标题  ')
    setInput(wrapper, '[data-test="sticky-note-quick-content"] textarea', '  临时正文  ')
    await nextTick()

    const fields = [
      wrapper.find('[data-test="sticky-note-quick-title"] input'),
      wrapper.find('[data-test="sticky-note-quick-content"] textarea'),
    ]
    const expected = {
      color: '#FFF0D9',
      content: '临时正文',
      tag_ids: [],
      title: '临时标题',
    }

    for (const field of fields) {
      for (const modifier of ['ctrlKey', 'metaKey'] as const) {
        const previousCount = wrapper.emitted('submit')?.length ?? 0
        await field.trigger('keydown', { key: 'Enter', [modifier]: true })
        expect(wrapper.emitted('submit')).toHaveLength(previousCount + 1)
        expect(wrapper.emitted('submit')?.at(-1)).toEqual([expected])
      }
    }
  })

  it.each([
    { isMac: true, modifier: '⌘', otherModifier: 'Ctrl' },
    { isMac: false, modifier: 'Ctrl', otherModifier: '⌘' },
  ])(
    '快捷键提示仅显示当前平台的 $modifier，不显示 $otherModifier',
    ({ isMac, modifier, otherModifier }) => {
      mocks.isMacPlatform = isMac
      const wrapper = mount(StickyNoteQuickAdd, { props: { tags: [] } })
      const shortcut = wrapper.find('.sticky-note-quick-add-shortcut').text()

      expect(shortcut).toBe(`${modifier} + Enter 保存`)
      expect(shortcut).not.toContain(otherModifier)
    },
  )

  it('键盘快捷键提交，保存中拦截提交，reset 恢复默认状态', async () => {
    const wrapper = mount(StickyNoteQuickAdd, {
      props: { tags: [...tagFixtures], saving: true },
    })
    const exposed = wrapper.vm as unknown as { submit: () => void; reset: () => void }
    exposed.submit()
    expect(wrapper.emitted('submit')).toBeUndefined()

    await wrapper.setProps({ saving: false })
    setInput(wrapper, '[data-test="sticky-note-quick-content"] textarea', '正文')
    await nextTick()
    const textarea = wrapper.find('[data-test="sticky-note-quick-content"] textarea')
    await textarea.trigger('keydown', { ctrlKey: true, key: 'Enter' })
    await textarea.trigger('keydown', { key: 'Enter', metaKey: true })
    expect(wrapper.emitted('submit')).toHaveLength(2)

    exposed.reset()
    await nextTick()
    expect(wrapper.find<HTMLTextAreaElement>('textarea').element.value).toBe('')
    expect(wrapper.find('[data-test="sticky-note-color-#FFF0D9"]').attributes('aria-pressed')).toBe(
      'true',
    )
  })
})

describe('StickyNoteToolbar', () => {
  it('搜索、置顶、归档和标签选择发出独立载荷', async () => {
    const wrapper = mount(StickyNoteToolbar, {
      props: {
        archived: false,
        archivedCount: 12,
        count: 24,
        pinnedFirst: true,
        search: '',
        selectedTag: null,
        tags: [...tagFixtures],
      },
      attachTo: document.body,
    })

    const search = wrapper.findComponent(VTextField)
    search.vm.$emit('update:modelValue', '采购')
    search.vm.$emit('update:modelValue', null)
    await wrapper.find('[data-test="sticky-note-pinned-first"]').trigger('click')
    await wrapper.find('[data-test="sticky-note-archive-toggle"]').trigger('click')
    const filter = wrapper.findComponent(TagFilterMenu)
    filter.vm.$emit('update:modelValue', 2)

    expect(wrapper.emitted('update:search')).toEqual([['采购'], ['']])
    expect(wrapper.emitted('update:pinnedFirst')).toEqual([[false]])
    expect(wrapper.emitted('update:archived')).toEqual([[true]])
    expect(wrapper.emitted('update:selectedTag')).toEqual([[2]])
    expect(wrapper.text()).toContain('24 条便签')
    expect(wrapper.text()).toContain('归档 12')
    expect(wrapper.find('[data-test="sticky-note-pinned-first"]').classes()).toContain(
      'sticky-note-pin-button',
    )
    expect(wrapper.find('[data-test="sticky-note-clear-filters"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('任一筛选激活均展示清除入口，移动端搜索占整行并支持加载禁用', async () => {
    mocks.smAndDown = true
    const wrapper = mount(StickyNoteToolbar, {
      props: {
        archived: true,
        count: 0,
        pinnedFirst: false,
        search: '搜索',
        selectedTag: 1,
        tags: [],
        tagsLoading: true,
      },
    })

    expect(wrapper.classes()).toContain('sticky-note-toolbar-mobile')
    await wrapper.find('[data-test="sticky-note-clear-filters"]').trigger('click')
    expect(wrapper.emitted('clear')).toEqual([[]])
    expect(wrapper.findComponent(TagFilterMenu).props('disabled')).toBe(true)
  })
})
