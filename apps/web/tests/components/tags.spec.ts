import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { VBottomSheet, VCard, VDialog } from 'vuetify/components'

import { ApiError } from '@/api/errors'
import type { Tag } from '@/api/tags'
import TagChipList from '@/components/tags/TagChipList.vue'
import TagFilterMenu from '@/components/tags/TagFilterMenu.vue'
import TagManageDialog from '@/components/tags/TagManageDialog.vue'
import { useSnackbarState } from '@/composables/useSnackbar'
import { useTagsStore } from '@/stores/tags'

import { tagFixtures } from '../fixtures/entities'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  smAndDown: false,
  mdAndUp: true,
}))

vi.mock('@/api/tags', () => ({
  list: mocks.list,
  create: mocks.create,
  update: mocks.update,
  remove: mocks.remove,
}))

vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vuetify')>()
  return {
    ...actual,
    useDisplay: () => ({
      smAndDown: mocks.smAndDown,
      mdAndUp: mocks.mdAndUp,
    }),
  }
})

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

function query(selector: string): HTMLElement {
  const element = document.querySelector(selector)
  if (element === null || !(element instanceof HTMLElement)) {
    throw new Error(`找不到测试元素：${selector}`)
  }
  return element
}

async function click(selector: string): Promise<void> {
  query(selector).click()
  await flushPromises()
  await nextTick()
}

async function clickButtonText(text: string): Promise<void> {
  const button = Array.from(document.querySelectorAll('button')).find(
    (candidate) => candidate.textContent.trim() === text,
  )
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`找不到按钮：${text}`)
  }
  button.click()
  await flushPromises()
  await nextTick()
}

async function setTagName(value: string): Promise<void> {
  const input = query('[data-test="tag-name-input"] input') as HTMLInputElement
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
}

async function mountDialog(): Promise<{
  wrapper: VueWrapper
  store: ReturnType<typeof useTagsStore>
}> {
  const pinia: Pinia = createPinia()
  setActivePinia(pinia)
  const store = useTagsStore()
  mocks.list.mockResolvedValue(tagFixtures.map((tag) => ({ ...tag })))
  await store.fetchAll()
  const wrapper = mount(TagManageDialog, {
    props: { modelValue: true },
    global: { plugins: [pinia] },
    attachTo: document.body,
  })
  await flushPromises()
  return { wrapper, store }
}

beforeEach(() => {
  mocks.list.mockReset()
  mocks.create.mockReset()
  mocks.update.mockReset()
  mocks.remove.mockReset()
  mocks.smAndDown = false
  mocks.mdAndUp = true
})

afterEach(() => {
  useSnackbarState().dismiss()
  document.body.innerHTML = ''
})

describe('TagChipList', () => {
  it('只读展示标签名称，启用点击后发出完整标签', async () => {
    const wrapper = mount(TagChipList, {
      props: { tags: [...tagFixtures], clickable: true },
    })

    expect(wrapper.text()).toContain('家庭')
    expect(wrapper.text()).toContain('工作')
    await wrapper.find('button').trigger('click')

    expect(wrapper.emitted('select')).toEqual([[tagFixtures[0]]])
  })
})

describe('TagFilterMenu', () => {
  it('选择标签并清除筛选时发出单值载荷', async () => {
    const wrapper = mount(TagFilterMenu, {
      props: { tags: [...tagFixtures], modelValue: null },
      attachTo: document.body,
    })

    await click('.tag-filter-menu-activator')
    await click('[data-test="tag-filter-option-2"]')
    expect(wrapper.emitted('update:modelValue')).toEqual([[2]])
    expect(wrapper.emitted('change')).toEqual([[2]])

    await wrapper.setProps({ modelValue: 2 })
    await click('.tag-filter-menu-activator')
    await click('[data-test="tag-filter-clear"]')
    expect(wrapper.emitted('update:modelValue')).toEqual([[2], [null]])
    expect(wrapper.emitted('change')).toEqual([[2], [null]])
    wrapper.unmount()
  })

  it('空标签列表展示桌面与移动端空态', async () => {
    const desktop = mount(TagFilterMenu, {
      props: { tags: [], modelValue: null, disabled: true, loading: true },
      attachTo: document.body,
    })
    expect(query('.tag-filter-menu-activator')).toHaveProperty('disabled', true)
    await desktop.setProps({ disabled: false, loading: false })
    await click('.tag-filter-menu-activator')
    expect(document.body.textContent).toContain('暂无可用标签，请先创建。')
    desktop.unmount()
    document.body.innerHTML = ''

    mocks.smAndDown = true
    mocks.mdAndUp = false
    const mobile = mount(TagFilterMenu, {
      props: { tags: [], modelValue: null },
      attachTo: document.body,
    })
    await click('.tag-filter-menu-activator')
    expect(document.body.textContent).toContain('暂无可用标签，请先创建。')
    await click('[data-test="tag-filter-all"]')
    expect(mobile.emitted('update:modelValue')).toEqual([[null]])
    mobile.unmount()
  })

  it('移动端 Bottom Sheet 支持选择、全部与清除筛选', async () => {
    mocks.smAndDown = true
    mocks.mdAndUp = false
    const wrapper = mount(TagFilterMenu, {
      props: { tags: [...tagFixtures], modelValue: 2 },
      attachTo: document.body,
    })

    expect(wrapper.text()).toContain('工作')
    await click('.tag-filter-menu-activator')
    expect(wrapper.findComponent(VBottomSheet).props('modelValue')).toBe(true)
    wrapper.findComponent(VBottomSheet).vm.$emit('update:modelValue', false)
    await nextTick()
    expect(wrapper.findComponent(VBottomSheet).props('modelValue')).toBe(false)
    await click('[data-test="tag-filter-option-1"]')
    expect(wrapper.emitted('update:modelValue')).toEqual([[1]])
    expect(wrapper.emitted('change')).toEqual([[1]])

    await wrapper.setProps({ modelValue: 1 })
    await click('.tag-filter-menu-activator')
    await click('[data-test="tag-filter-clear"]')
    expect(wrapper.emitted('update:modelValue')).toEqual([[1], [null]])

    await click('.tag-filter-menu-activator')
    await click('[data-test="tag-filter-all"]')
    expect(wrapper.emitted('change')).toEqual([[1], [null], [null]])
    wrapper.unmount()
  })
})

describe('TagManageDialog', () => {
  it('颜色选项、已选颜色和无障碍名称使用本地化颜色名而非 HEX', async () => {
    const { wrapper } = await mountDialog()
    const options = [
      { hex: '#C2410C', label: '橙色' },
      { hex: '#1867C0', label: '蓝色' },
      { hex: '#217A46', label: '绿色' },
      { hex: '#8A5A00', label: '黄色' },
      { hex: '#BA1A1A', label: '红色' },
      { hex: '#5E35B1', label: '紫色' },
      { hex: '#00838F', label: '青色' },
      { hex: '#546E7A', label: '灰色' },
    ]

    for (const { hex, label } of options) {
      const button = query(`[data-test="tag-color-${hex}"]`)
      expect(button.textContent).toContain(label)
      expect(button.textContent).not.toContain(hex)
      expect(button.getAttribute('aria-label')).toBe(`使用颜色 ${label}`)
    }
    expect(document.body.textContent).toContain('已选颜色：橙色')

    await click('[data-test="tag-color-#217A46"]')
    expect(document.body.textContent).toContain('已选颜色：绿色')
    expect(document.body.textContent).not.toContain('已选颜色：#217A46')
    wrapper.unmount()
  })

  it('新建发出服务端标签载荷，保存中禁用提交并拦截重复提交', async () => {
    const { wrapper } = await mountDialog()
    const request = deferred<Tag>()
    mocks.create.mockReturnValue(request.promise)
    const response: Tag = {
      id: 3,
      name: '阅读',
      color: '#217A46',
      created_at: '2026-11-28T08:00:00Z',
      updated_at: '2026-11-28T08:00:00Z',
    }

    await setTagName('  阅读  ')
    await click('[data-test="tag-color-#217A46"]')
    query('form.tag-manage-dialog-section').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true }),
    )
    await nextTick()

    const submit = query('[data-test="tag-submit"]') as HTMLButtonElement
    expect(submit.disabled).toBe(true)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    expect(mocks.create).toHaveBeenCalledWith({ name: '阅读', color: '#217A46' })
    const exposed = wrapper.vm as unknown as { submit: () => Promise<void> }
    await exposed.submit()
    expect(mocks.create).toHaveBeenCalledTimes(1)
    wrapper.findComponent(VDialog).vm.$emit('update:modelValue', false)
    await nextTick()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    request.resolve(response)
    await flushPromises()
    expect(wrapper.emitted('created')).toEqual([[response]])
    expect(submit.disabled).toBe(false)
    expect(useSnackbarState().state.message).toBe('标签已创建。')
    await click('[aria-label="关闭标签管理"]')
    expect(wrapper.emitted('update:modelValue')).toEqual([[false]])
    wrapper.unmount()
  })

  it('改名换色后发出 updated 载荷', async () => {
    const { wrapper } = await mountDialog()
    const response: Tag = {
      ...tagFixtures[0],
      name: '家庭生活',
      color: '#5E35B1',
      updated_at: '2026-11-28T09:00:00Z',
    }
    mocks.update.mockResolvedValue(response)

    await click('[data-test="tag-edit-1"]')
    await setTagName('家庭生活')
    await click('[data-test="tag-color-#5E35B1"]')
    await click('[data-test="tag-submit"]')

    expect(mocks.update).toHaveBeenCalledWith(1, { name: '家庭生活', color: '#5E35B1' })
    expect(wrapper.emitted('updated')).toEqual([[response]])
    wrapper.unmount()
  })

  it('保存失败保留输入并通过 Snackbar 提示已回滚', async () => {
    const { wrapper, store } = await mountDialog()
    const error = new ApiError('validation', 'apiErrors.validation', '标签名称已存在。', 400)
    mocks.create.mockRejectedValue(error)

    await setTagName('重复名称')
    await click('[data-test="tag-submit"]')

    const input = query('[data-test="tag-name-input"] input') as HTMLInputElement
    expect(input.value).toBe('重复名称')
    expect(store.ordered).toHaveLength(2)
    expect(useSnackbarState().state).toMatchObject({
      visible: true,
      tone: 'error',
      message: '操作失败，已恢复原状态：标签名称已存在。',
    })
    expect(wrapper.emitted('created')).toBeUndefined()
    wrapper.unmount()
  })

  it('空白名称显示校验错误，输入后清除错误', async () => {
    const { wrapper } = await mountDialog()

    await click('[data-test="tag-submit"]')
    expect(document.body.textContent).toContain('请输入标签名称。')
    expect(mocks.create).not.toHaveBeenCalled()

    await setTagName('有效名称')
    expect(document.body.textContent).not.toContain('请输入标签名称。')
    wrapper.unmount()
  })

  it('Store 拦截重复创建时保留表单且不发 created', async () => {
    const { wrapper, store } = await mountDialog()
    store.mutationPendingIds.add('create')
    await setTagName('阅读')

    await click('[data-test="tag-submit"]')

    expect(mocks.create).not.toHaveBeenCalled()
    expect(wrapper.emitted('created')).toBeUndefined()
    expect(query('[data-test="tag-name-input"] input')).toHaveProperty('value', '阅读')
    wrapper.unmount()
  })

  it('Store 拦截重复更新时不发 updated，并可取消编辑', async () => {
    const { wrapper, store } = await mountDialog()
    await click('[data-test="tag-edit-1"]')
    store.mutationPendingIds.add('1')
    await setTagName('家庭生活')

    await click('[data-test="tag-submit"]')
    expect(mocks.update).not.toHaveBeenCalled()
    expect(wrapper.emitted('updated')).toBeUndefined()

    await clickButtonText('取消编辑')
    expect(query('[data-test="tag-name-input"] input')).toHaveProperty('value', '')
    expect(document.body.textContent).toContain('新建标签')
    wrapper.unmount()
  })

  it('首次打开加载空列表，关闭后重开不重复请求', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const request = deferred<Tag[]>()
    mocks.list.mockReturnValue(request.promise)
    const wrapper = mount(TagManageDialog, {
      props: { modelValue: true },
      global: { plugins: [pinia] },
      attachTo: document.body,
    })
    await nextTick()
    expect(document.querySelector('.v-skeleton-loader')).not.toBeNull()

    request.resolve([])
    await flushPromises()
    expect(document.body.textContent).toContain('还没有标签')
    await wrapper.setProps({ modelValue: false })
    await wrapper.setProps({ modelValue: true })
    expect(mocks.list).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('首次加载失败可重试，错误缺少文案时显示未知错误', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const store = useTagsStore()
    const error = new ApiError('network', 'apiErrors.network', '网络不可用', null)
    mocks.list.mockRejectedValueOnce(error).mockResolvedValueOnce([])
    const wrapper = mount(TagManageDialog, {
      props: { modelValue: true },
      global: { plugins: [pinia] },
      attachTo: document.body,
    })
    await flushPromises()

    expect(document.body.textContent).toContain('网络不可用')
    Object.defineProperty(error, 'message', { value: undefined })
    store.listRequest = { ...store.listRequest }
    await nextTick()
    expect(document.body.textContent).toContain('发生未知错误，请稍后重试。')

    await click('.app-error-state .v-btn')
    expect(mocks.list).toHaveBeenCalledTimes(2)
    expect(store.listRequest.status).toBe('success')
    expect(document.body.textContent).toContain('还没有标签')
    wrapper.unmount()
  })

  it('移动端使用全屏对话框与直角卡片', async () => {
    mocks.smAndDown = true
    mocks.mdAndUp = false
    const { wrapper } = await mountDialog()

    expect(wrapper.findComponent(VDialog).props('fullscreen')).toBe(true)
    expect(wrapper.findComponent(VCard).props('rounded')).toBe('0')
    wrapper.unmount()
  })

  it('删除必须二次确认，明确保留关联实体并发出 removed ID', async () => {
    const { wrapper, store } = await mountDialog()
    mocks.remove.mockResolvedValue(undefined)

    await click('[data-test="tag-delete-1"]')
    expect(mocks.remove).not.toHaveBeenCalled()
    expect(document.body.textContent).toContain('此操作只解除关联，不删除便签、待办或日程。')
    expect(document.body.textContent).toContain('关联的便签、待办和日程内容都会保留。')

    await click('[data-test="tag-delete-confirm"]')
    expect(mocks.remove).toHaveBeenCalledWith(1)
    expect(wrapper.emitted('removed')).toEqual([[1]])
    expect(store.byId(1)).toBeUndefined()
    expect(useSnackbarState().state.message).toBe('标签已删除，关联已解除。')
    wrapper.unmount()
  })

  it('取消删除关闭确认框，无候选项时确认不会请求', async () => {
    const { wrapper } = await mountDialog()
    await click('[data-test="tag-delete-1"]')

    await clickButtonText('取消')
    expect(wrapper.findAllComponents(VDialog)[1]?.props('modelValue')).toBe(false)

    const exposed = wrapper.vm as unknown as { confirmDelete: () => Promise<void> }
    await exposed.confirmDelete()
    expect(mocks.remove).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('Store 拒绝重复删除时保留确认框且不发 removed', async () => {
    const { wrapper, store } = await mountDialog()
    store.mutationPendingIds.add('1')
    await click('[data-test="tag-delete-1"]')

    await click('[data-test="tag-delete-confirm"]')

    expect(mocks.remove).not.toHaveBeenCalled()
    expect(wrapper.emitted('removed')).toBeUndefined()
    expect(wrapper.findAllComponents(VDialog)[1]?.props('modelValue')).toBe(true)
    wrapper.unmount()
  })

  it('删除失败保留候选项并提示已回滚', async () => {
    const { wrapper } = await mountDialog()
    mocks.remove.mockRejectedValue(new ApiError('server', 'apiErrors.server', '删除失败', 500))
    await click('[data-test="tag-delete-1"]')

    await click('[data-test="tag-delete-confirm"]')

    expect(wrapper.emitted('removed')).toBeUndefined()
    expect(wrapper.findAllComponents(VDialog)[1]?.props('modelValue')).toBe(true)
    expect(useSnackbarState().state.message).toBe('操作失败，已恢复原状态：删除失败')
    wrapper.unmount()
  })

  it('删除中拦截重复确认与关闭，删除正在编辑的标签后重置表单', async () => {
    const { wrapper } = await mountDialog()
    const request = deferred<undefined>()
    mocks.remove.mockReturnValue(request.promise)
    await click('[data-test="tag-edit-1"]')
    await click('[data-test="tag-delete-1"]')
    await click('[data-test="tag-delete-confirm"]')
    const exposed = wrapper.vm as unknown as { confirmDelete: () => Promise<void> }

    await exposed.confirmDelete()
    wrapper.findAllComponents(VDialog)[0]?.vm.$emit('update:modelValue', false)
    wrapper.findAllComponents(VDialog)[1]?.vm.$emit('update:modelValue', false)
    await nextTick()
    expect(mocks.remove).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.findAllComponents(VDialog)[1]?.props('modelValue')).toBe(true)

    request.resolve(undefined)
    await flushPromises()
    expect(wrapper.emitted('removed')).toEqual([[1]])
    expect(query('[data-test="tag-name-input"] input')).toHaveProperty('value', '')
    expect(document.body.textContent).toContain('新建标签')
    wrapper.unmount()
  })
})
