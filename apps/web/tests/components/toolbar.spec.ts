import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/errors'
import type { Tag } from '@/api/tags'
import TagFilterMenu from '@/components/tags/TagFilterMenu.vue'
import TagManageDialog from '@/components/tags/TagManageDialog.vue'
import TagToolbar from '@/components/tags/TagToolbar.vue'
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
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise
  })
  return { promise, resolve }
}

function mountToolbar(modelValue: number | null = null) {
  const pinia: Pinia = createPinia()
  setActivePinia(pinia)
  const store = useTagsStore()
  const wrapper = mount(TagToolbar, {
    props: { modelValue },
    global: {
      plugins: [pinia],
      stubs: { TagFilterMenu: true, TagManageDialog: true },
    },
  })
  return { store, wrapper }
}

beforeEach(() => {
  mocks.list.mockReset()
  mocks.create.mockReset()
  mocks.update.mockReset()
  mocks.remove.mockReset()
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('TagToolbar', () => {
  it('挂载时加载标签并同步筛选、管理开关和删除结果', async () => {
    const request = deferred<Tag[]>()
    mocks.list.mockReturnValue(request.promise)
    const { wrapper } = mountToolbar(1)
    await flushPromises()
    const filter = wrapper.findComponent(TagFilterMenu)
    expect(filter.props('loading')).toBe(true)
    expect(filter.props('disabled')).toBe(true)

    request.resolve(tagFixtures.map((tag) => ({ ...tag })))
    await flushPromises()
    expect(filter.props('loading')).toBe(false)
    expect(filter.props('disabled')).toBe(false)
    expect(filter.props('tags')).toEqual(tagFixtures)

    filter.vm.$emit('update:modelValue', 2)
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])

    await wrapper.find('.tag-toolbar-manage').trigger('click')
    const dialog = wrapper.findComponent(TagManageDialog)
    expect(dialog.props('modelValue')).toBe(true)
    dialog.vm.$emit('update:modelValue', false)
    await flushPromises()
    expect(dialog.props('modelValue')).toBe(false)

    dialog.vm.$emit('removed', 1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[2], [null]])
    await wrapper.setProps({ modelValue: 2 })
    dialog.vm.$emit('removed', 1)
    expect(wrapper.emitted('update:modelValue')).toEqual([[2], [null]])
    wrapper.unmount()
  })

  it('已有加载结果时挂载不重复请求', async () => {
    mocks.list.mockResolvedValue(tagFixtures.map((tag) => ({ ...tag })))
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useTagsStore()
    await store.fetchAll()
    mocks.list.mockClear()

    const wrapper = mount(TagToolbar, {
      props: { modelValue: null },
      global: {
        plugins: [pinia],
        stubs: { TagFilterMenu: true, TagManageDialog: true },
      },
    })

    expect(mocks.list).not.toHaveBeenCalled()
    expect(wrapper.findComponent(TagFilterMenu).props('tags')).toEqual(tagFixtures)
    wrapper.unmount()
  })

  it('加载失败展示错误并可通过重试恢复', async () => {
    mocks.list
      .mockRejectedValueOnce(new ApiError('network', 'apiErrors.network', '网络不可用', null))
      .mockResolvedValueOnce(tagFixtures.map((tag) => ({ ...tag })))
    const { wrapper } = mountToolbar()
    await flushPromises()

    expect(wrapper.find('.v-alert').text()).toContain('网络不可用')
    await wrapper.find('.v-alert .v-btn').trigger('click')
    await flushPromises()

    expect(mocks.list).toHaveBeenCalledTimes(2)
    expect(wrapper.find('.v-alert').exists()).toBe(false)
    wrapper.unmount()
  })
})
