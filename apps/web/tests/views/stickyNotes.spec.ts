import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { defineComponent, h, nextTick } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { ApiError } from '@/api/errors'
import type { StickyNote } from '@/api/stickyNotes'
import ConvertStickyNoteDialog from '@/components/sticky-notes/ConvertStickyNoteDialog.vue'
import StickyNoteEditDialog from '@/components/sticky-notes/StickyNoteEditDialog.vue'
import StickyNoteMasonry from '@/components/sticky-notes/StickyNoteMasonry.vue'
import StickyNoteQuickAdd from '@/components/sticky-notes/StickyNoteQuickAdd.vue'
import StickyNoteToolbar from '@/components/sticky-notes/StickyNoteToolbar.vue'
import TagManageDialog from '@/components/tags/TagManageDialog.vue'
import { useSnackbarState } from '@/composables/useSnackbar'
import { useStickyNotesStore } from '@/stores/stickyNotes'
import { useTagsStore } from '@/stores/tags'
import StickyNotesView from '@/views/StickyNotesView.vue'

import { copyStickyNoteFixtures, tagFixtures } from '../fixtures/entities'
import { at, required } from '../utils/data'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  reorder: vi.fn(),
  convertToTodo: vi.fn(),
  listTags: vi.fn(),
  resetQuickAdd: vi.fn(),
}))

vi.mock('@/api/stickyNotes', () => ({
  list: mocks.list,
  create: mocks.create,
  update: mocks.update,
  remove: mocks.remove,
  reorder: mocks.reorder,
  convertToTodo: mocks.convertToTodo,
}))

vi.mock('@/api/tags', () => ({
  list: mocks.listTags,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

const QuickAddStub = defineComponent({
  name: 'StickyNoteQuickAdd',
  emits: ['submit'],
  setup(_, { expose }) {
    expose({ reset: mocks.resetQuickAdd })
    return () => h('div', { 'data-test': 'quick-add-stub' })
  },
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

async function makeRouter(initialPath = '/sticky-notes'): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/sticky-notes', component: { template: '<div />' } },
      { path: '/todos', component: { template: '<div />' } },
    ],
  })
  await router.push(initialPath)
  await router.isReady()
  return router
}

interface MountedView {
  wrapper: ReturnType<typeof mount>
  store: ReturnType<typeof useStickyNotesStore>
  tagsStore: ReturnType<typeof useTagsStore>
  router: Router
}

async function mountView(initialPath?: string): Promise<MountedView> {
  const pinia: Pinia = createPinia()
  setActivePinia(pinia)
  const store = useStickyNotesStore()
  const tagsStore = useTagsStore()
  const router = await makeRouter(initialPath)
  const wrapper = mount(StickyNotesView, {
    global: {
      plugins: [pinia, router],
      stubs: {
        StickyNoteQuickAdd: QuickAddStub,
        StickyNoteToolbar: true,
        StickyNoteMasonry: true,
        StickyNoteEditDialog: true,
        ConvertStickyNoteDialog: true,
        TagManageDialog: true,
      },
    },
  })
  await flushPromises()
  return { wrapper, store, tagsStore, router }
}

const input = { title: '新便签', content: '正文', color: '#FFF0D9' as const, tag_ids: [1] }

/** 读取瀑布流替身收到的 props；替身组件没有声明类型，因此这里显式收窄。 */
function masonryProps(wrapper: ReturnType<typeof mount>): {
  hint: string
  notes: readonly StickyNote[]
  sortable: boolean
} {
  const props = wrapper.findComponent(StickyNoteMasonry).props() as Partial<{
    hint: string
    notes: readonly StickyNote[]
    sortable: boolean
  }>
  return {
    hint: props.hint ?? '',
    notes: props.notes ?? [],
    sortable: props.sortable === true,
  }
}

/** 读取 Store 中必定存在的便签。 */
function storedNote(store: ReturnType<typeof useStickyNotesStore>, id: number): StickyNote {
  return required(store.byId(id), `便签 ${String(id)}`)
}

beforeEach(() => {
  mocks.list.mockReset()
  mocks.create.mockReset()
  mocks.update.mockReset()
  mocks.remove.mockReset()
  mocks.reorder.mockReset()
  mocks.convertToTodo.mockReset()
  mocks.listTags.mockReset()
  mocks.resetQuickAdd.mockReset()
  mocks.list.mockResolvedValue(copyStickyNoteFixtures())
  mocks.listTags.mockResolvedValue(tagFixtures.map((tag) => ({ ...tag })))
  useSnackbarState().dismiss()
})

describe('StickyNotesView', () => {
  it('聚合首次骨架屏、成功列表和标签加载', async () => {
    const request = deferred<StickyNote[]>()
    mocks.list.mockReturnValueOnce(request.promise)
    const pinia = createPinia()
    setActivePinia(pinia)
    const router = await makeRouter()
    const wrapper = mount(StickyNotesView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          StickyNoteQuickAdd: QuickAddStub,
          StickyNoteToolbar: true,
          StickyNoteMasonry: true,
          TagManageDialog: true,
        },
      },
    })
    expect(wrapper.find('[data-test="sticky-notes-loading"]').exists()).toBe(true)

    request.resolve(copyStickyNoteFixtures())
    await flushPromises()
    const masonry = wrapper.findComponent(StickyNoteMasonry)
    expect(masonry.exists()).toBe(true)
    expect(masonryProps(wrapper).notes.map((note) => note.id)).toEqual([1, 2])
    expect(masonryProps(wrapper).sortable).toBe(true)
    expect(mocks.listTags).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('便签 · 快速捕捉工作台')
    wrapper.unmount()
  })

  it('非法 query 回退默认，合法数组 query 映射归档和最近排序', async () => {
    const invalid = await mountView('/sticky-notes?tag=-2&ordering=invalid&archived=invalid')
    expect(invalid.store.filters).toEqual({
      tag: null,
      search: '',
      is_archived: false,
      ordering: '-is_pinned,position',
    })
    expect(mocks.list).toHaveBeenCalledWith({
      tag: null,
      search: '',
      is_archived: false,
      ordering: '-is_pinned,position',
    })
    invalid.wrapper.unmount()

    mocks.list.mockClear()
    const valid = await mountView(
      '/sticky-notes?tag=2&tag=1&search=维修&search=其他&archived=1&ordering=-updated_at',
    )
    expect(valid.store.filters).toEqual({
      tag: 2,
      search: '维修',
      is_archived: true,
      ordering: '-updated_at',
    })
    // 后端重排要求完整未归档集合，故标签与搜索只在本地过滤，请求不带这两个条件。
    expect(mocks.list).toHaveBeenCalledWith({
      tag: null,
      search: '',
      is_archived: true,
      ordering: '-updated_at',
    })
    valid.wrapper.unmount()
  })

  it('工具条事件同步 query，清除恢复默认', async () => {
    const { wrapper, router } = await mountView()
    const toolbar = wrapper.findComponent(StickyNoteToolbar)

    toolbar.vm.$emit('update:search', '采购')
    await flushPromises()
    expect(router.currentRoute.value.query['search']).toBe('采购')
    toolbar.vm.$emit('update:selectedTag', 1)
    await flushPromises()
    expect(router.currentRoute.value.query['tag']).toBe('1')
    toolbar.vm.$emit('update:pinnedFirst', false)
    await flushPromises()
    expect(router.currentRoute.value.query['ordering']).toBe('position')
    toolbar.vm.$emit('update:pinnedFirst', true)
    await flushPromises()
    expect(router.currentRoute.value.query['ordering']).toBeUndefined()
    toolbar.vm.$emit('update:archived', true)
    await flushPromises()
    expect(router.currentRoute.value.query['archived']).toBe('1')

    toolbar.vm.$emit('clear')
    await flushPromises()
    expect(router.currentRoute.value.query).toEqual({})
    wrapper.unmount()
  })

  it('创建成功重置 QuickAdd，创建中拦截重复提交', async () => {
    const { wrapper } = await mountView()
    const request = deferred<StickyNote>()
    mocks.create.mockReturnValue(request.promise)
    const quickAdd = wrapper.findComponent(StickyNoteQuickAdd)

    quickAdd.vm.$emit('submit', input)
    quickAdd.vm.$emit('submit', input)
    await nextTick()
    expect(mocks.create).toHaveBeenCalledTimes(1)
    request.resolve({ ...at(copyStickyNoteFixtures(), 0), id: 4 })
    await flushPromises()
    expect(mocks.resetQuickAdd).toHaveBeenCalledTimes(1)
    expect(useSnackbarState().state.message).toBe('便签已保存。')
    wrapper.unmount()
  })

  it('创建失败保留输入并提示回滚，Store 去重返回空时不重置', async () => {
    const { wrapper, store } = await mountView()
    mocks.create.mockRejectedValueOnce(new ApiError('server', 'apiErrors.server', '创建失败', 500))
    wrapper.findComponent(StickyNoteQuickAdd).vm.$emit('submit', input)
    await flushPromises()
    expect(useSnackbarState().state.message).toContain('创建失败')
    expect(mocks.resetQuickAdd).not.toHaveBeenCalled()

    store.mutationPendingIds.add('create')
    wrapper.findComponent(StickyNoteQuickAdd).vm.$emit('submit', input)
    await flushPromises()
    expect(mocks.resetQuickAdd).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('编辑入口选中实体，保存成功关闭并提示，重复保存被拦截', async () => {
    const { wrapper, store } = await mountView()
    const note = storedNote(store, 1)
    wrapper.findComponent(StickyNoteMasonry).vm.$emit('edit', note)
    await nextTick()
    const dialog = wrapper.findComponent(StickyNoteEditDialog)
    expect(dialog.exists()).toBe(true)
    const request = deferred<StickyNote>()
    mocks.update.mockReturnValue(request.promise)

    dialog.vm.$emit('save', 1, input)
    dialog.vm.$emit('save', 1, input)
    await nextTick()
    expect(mocks.update).toHaveBeenCalledTimes(1)
    request.resolve({ ...note, ...input, tags: [{ id: 1, name: '家庭', color: '#C2410C' }] })
    await flushPromises()
    expect(store.editingId).toBeNull()
    expect(wrapper.findComponent(StickyNoteEditDialog).exists()).toBe(false)
    expect(useSnackbarState().state.message).toBe('便签修改已保存。')
    wrapper.unmount()
  })

  it('编辑失败和 Store 去重保留对话框', async () => {
    const { wrapper, store } = await mountView()
    const note = storedNote(store, 1)
    wrapper.findComponent(StickyNoteMasonry).vm.$emit('edit', note)
    await nextTick()
    mocks.update.mockRejectedValueOnce(
      new ApiError('validation', 'apiErrors.validation', '保存失败', 400),
    )
    wrapper.findComponent(StickyNoteEditDialog).vm.$emit('save', 1, input)
    await flushPromises()
    expect(wrapper.findComponent(StickyNoteEditDialog).exists()).toBe(true)
    expect(useSnackbarState().state.message).toContain('保存失败')

    store.mutationPendingIds.add('1')
    wrapper.findComponent(StickyNoteEditDialog).vm.$emit('save', 1, input)
    await flushPromises()
    expect(wrapper.findComponent(StickyNoteEditDialog).exists()).toBe(true)
    wrapper.unmount()
  })

  it('卡片置顶、归档、恢复和排序事件进入 Store，失败统一提示', async () => {
    const { wrapper } = await mountView()
    mocks.update.mockImplementation((id: number, patch: Partial<StickyNote>) =>
      Promise.resolve({
        ...required(
          copyStickyNoteFixtures().find((note) => note.id === id),
          `便签 ${String(id)}`,
        ),
        ...patch,
      }),
    )
    mocks.reorder.mockResolvedValue(undefined)
    const masonry = wrapper.findComponent(StickyNoteMasonry)
    const [first, second, third] = copyStickyNoteFixtures()

    // 先在未发生状态变更时重排：上送的是未归档全集 [2, 1]，无遗漏无重复。
    masonry.vm.$emit('reorder', [2, 1])
    await flushPromises()
    expect(mocks.reorder).toHaveBeenCalledWith([2, 1])

    masonry.vm.$emit('toggle-pin', required(first, '便签 1'))
    masonry.vm.$emit('archive', required(second, '便签 2'))
    masonry.vm.$emit('restore', required(third, '便签 3'))
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledTimes(3)

    mocks.reorder.mockRejectedValueOnce(
      new ApiError('network', 'apiErrors.network', '排序失败', null),
    )
    masonry.vm.$emit('reorder', [1])
    await flushPromises()
    expect(useSnackbarState().state.message).toContain('排序失败')
    wrapper.unmount()
  })

  it('归档区域也转发卡片操作', async () => {
    const archivedNotes = [3, 4, 5].map((id) => ({ ...at(copyStickyNoteFixtures(), 2), id }))
    mocks.list.mockResolvedValue(archivedNotes)
    mocks.update.mockImplementation((id: number, patch: Partial<StickyNote>) =>
      Promise.resolve({
        ...required(
          archivedNotes.find((note) => note.id === id),
          `归档便签 ${String(id)}`,
        ),
        ...patch,
      }),
    )
    const { wrapper } = await mountView('/sticky-notes?archived=1')
    const masonry = wrapper.findComponent(StickyNoteMasonry)

    expect(masonryProps(wrapper).sortable).toBe(false)
    expect(masonryProps(wrapper).hint).toContain('归档便签不支持拖拽排序')
    // 归档视图里没有未归档便签，重排直接返回，不会向后端发送不完整顺序。
    masonry.vm.$emit('reorder', [3])
    masonry.vm.$emit('restore', at(archivedNotes, 0))
    masonry.vm.$emit('archive', at(archivedNotes, 1))
    masonry.vm.$emit('toggle-pin', at(archivedNotes, 2))
    await flushPromises()
    expect(mocks.update).toHaveBeenCalledTimes(3)
    expect(mocks.reorder).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('标签筛选时禁用拖拽并给出可读提示', async () => {
    mocks.list.mockResolvedValue([at(copyStickyNoteFixtures(), 0)])
    const { wrapper } = await mountView('/sticky-notes?tag=1')
    expect(masonryProps(wrapper).sortable).toBe(false)
    expect(masonryProps(wrapper).hint).toContain('筛选状态下不可拖拽排序')
    wrapper.unmount()
  })

  it('管理标签按钮与各对话框关闭事件双向同步可见性', async () => {
    const { wrapper } = await mountView()
    const masonry = wrapper.findComponent(StickyNoteMasonry)

    const manageButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('管理标签'))
    expect(manageButton).toBeDefined()
    await manageButton?.trigger('click')
    const tagDialog = wrapper.findComponent(TagManageDialog)
    expect(tagDialog.props('modelValue')).toBe(true)
    tagDialog.vm.$emit('update:modelValue', false)
    await nextTick()
    expect(tagDialog.props('modelValue')).toBe(false)

    masonry.vm.$emit('edit', at(copyStickyNoteFixtures(), 0))
    await nextTick()
    const editDialog = wrapper.findComponent(StickyNoteEditDialog)
    expect(editDialog.props('modelValue')).toBe(true)
    editDialog.vm.$emit('update:modelValue', false)
    await nextTick()
    expect(editDialog.props('modelValue')).toBe(false)

    masonry.vm.$emit('convert', at(copyStickyNoteFixtures(), 0))
    await nextTick()
    const convertDialog = wrapper.findComponent(ConvertStickyNoteDialog)
    expect(convertDialog.props('modelValue')).toBe(true)
    convertDialog.vm.$emit('update:modelValue', false)
    await nextTick()
    expect(convertDialog.props('modelValue')).toBe(false)
    wrapper.unmount()
  })

  it('转换成功更新两个实体并通过提示动作导航待办', async () => {
    const { wrapper, router, store } = await mountView()
    const note = storedNote(store, 1)
    wrapper.findComponent(StickyNoteMasonry).vm.$emit('convert', note)
    await nextTick()
    const request = deferred<{ sticky_note: StickyNote; todo: { id: number; title: string } }>()
    mocks.convertToTodo.mockReturnValue(request.promise)
    const dialog = wrapper.findComponent(ConvertStickyNoteDialog)

    dialog.vm.$emit('confirm', 1, { priority: 'high' })
    dialog.vm.$emit('confirm', 1, { priority: 'high' })
    await nextTick()
    expect(mocks.convertToTodo).toHaveBeenCalledTimes(1)
    request.resolve({
      sticky_note: { ...note, is_archived: true },
      todo: { id: 9, title: note.title },
    })
    await flushPromises()
    expect(store.todosById['9']?.title).toBe(note.title)
    expect(useSnackbarState().state.actionLabel).toBe('查看待办')
    useSnackbarState().runAction()
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/todos')
    expect(router.currentRoute.value.query['todo']).toBe('9')
    expect(wrapper.findComponent(ConvertStickyNoteDialog).exists()).toBe(false)
    wrapper.unmount()
  })

  it('转换失败或 Store 去重保留转换对话框', async () => {
    const { wrapper, store } = await mountView()
    const note = storedNote(store, 1)
    wrapper.findComponent(StickyNoteMasonry).vm.$emit('convert', note)
    await nextTick()
    mocks.convertToTodo.mockRejectedValueOnce(
      new ApiError('server', 'apiErrors.server', '转换失败', 500),
    )
    wrapper.findComponent(ConvertStickyNoteDialog).vm.$emit('confirm', 1, {})
    await flushPromises()
    expect(wrapper.findComponent(ConvertStickyNoteDialog).exists()).toBe(true)
    expect(useSnackbarState().state.message).toContain('转换失败')

    store.mutationPendingIds.add('1')
    wrapper.findComponent(ConvertStickyNoteDialog).vm.$emit('confirm', 1, {})
    await flushPromises()
    expect(wrapper.findComponent(ConvertStickyNoteDialog).exists()).toBe(true)
    wrapper.unmount()
  })

  it('空列表、筛选空态与清除动作分别呈现', async () => {
    mocks.list.mockResolvedValueOnce([])
    const empty = await mountView()
    expect(empty.wrapper.text()).toContain('还没有便签')
    empty.wrapper.unmount()

    mocks.list.mockResolvedValue([at(copyStickyNoteFixtures(), 0)])
    const filtered = await mountView('/sticky-notes?search=不匹配')
    expect(filtered.wrapper.text()).toContain('没有匹配的便签')
    await filtered.wrapper.find('.app-empty-state .v-btn').trigger('click')
    await flushPromises()
    expect(filtered.router.currentRoute.value.query).toEqual({})
    filtered.wrapper.unmount()
  })

  it('首次失败显示错误并重试，未知错误文案有回退', async () => {
    const error = new ApiError('network', 'apiErrors.network', '网络失败', null)
    mocks.list.mockRejectedValueOnce(error)
    const { wrapper } = await mountView()
    expect(wrapper.text()).toContain('网络失败')

    Object.defineProperty(error, 'message', { value: undefined })
    useStickyNotesStore().listRequest = { ...useStickyNotesStore().listRequest }
    await nextTick()
    expect(wrapper.text()).toContain('发生未知错误，请稍后重试。')
    await wrapper.find('.app-error-state .v-btn').trigger('click')
    await flushPromises()
    expect(wrapper.findComponent(StickyNoteMasonry).exists()).toBe(true)
    wrapper.unmount()
  })

  it('标签请求失败不影响便签，已加载标签不重复请求', async () => {
    mocks.listTags.mockRejectedValueOnce(
      new ApiError('network', 'apiErrors.network', '标签失败', null),
    )
    const failed = await mountView()
    expect(failed.wrapper.findComponent(StickyNoteMasonry).exists()).toBe(true)
    failed.wrapper.unmount()

    const pinia = createPinia()
    setActivePinia(pinia)
    const tagsStore = useTagsStore()
    tagsStore.listRequest.status = 'success'
    const router = await makeRouter()
    const wrapper = mount(StickyNotesView, {
      global: {
        plugins: [pinia, router],
        stubs: {
          StickyNoteQuickAdd: QuickAddStub,
          StickyNoteToolbar: true,
          StickyNoteMasonry: true,
          TagManageDialog: true,
        },
      },
    })
    await flushPromises()
    expect(mocks.listTags).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })
})
