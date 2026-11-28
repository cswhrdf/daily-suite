import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { VSkeletonLoader } from 'vuetify/components'

import AppEmptyState from '@/components/shared/AppEmptyState.vue'
import AppErrorState from '@/components/shared/AppErrorState.vue'
import AppSkeleton from '@/components/shared/AppSkeleton.vue'
import GlobalSnackbar from '@/components/shared/GlobalSnackbar.vue'
import { useSnackbar, useSnackbarState } from '@/composables/useSnackbar'

const { dismiss } = useSnackbarState()

afterEach(() => {
  dismiss()
  document.body.innerHTML = ''
})

describe('共享状态组件', () => {
  it('AppEmptyState 渲染说明与主操作插槽', () => {
    const wrapper = mount(AppEmptyState, {
      props: { title: '暂无便签', description: '创建第一条便签。' },
      slots: { action: '<button class="create-action">新建</button>' },
    })

    expect(wrapper.text()).toContain('暂无便签')
    expect(wrapper.text()).toContain('创建第一条便签。')
    expect(wrapper.find('.create-action').text()).toBe('新建')
  })

  it('AppErrorState 使用双语默认文案并发出 retry', async () => {
    const wrapper = mount(AppErrorState, {
      props: { message: '请求失败，请重试。' },
    })

    expect(wrapper.text()).toContain('加载失败')
    expect(wrapper.text()).toContain('请求失败，请重试。')
    await wrapper.find('.v-btn').trigger('click')
    expect(wrapper.emitted('retry')).toEqual([[]])
  })

  it('AppSkeleton 把高度与类型传给 Vuetify 骨架', () => {
    const wrapper = mount(AppSkeleton, {
      props: { height: 120, type: 'article' },
    })
    const skeleton = wrapper.findComponent(VSkeletonLoader)

    expect(skeleton.props('height')).toBe(120)
    expect(skeleton.props('type')).toBe('article')
  })
})

describe('GlobalSnackbar', () => {
  it('成功与失败回滚提示使用各自语义色', () => {
    const snackbar = useSnackbar()
    const { state } = useSnackbarState()

    snackbar.success('保存成功')
    expect(state).toMatchObject({ visible: true, message: '保存成功', tone: 'success' })
    snackbar.rollback('操作失败，已回滚')
    expect(state).toMatchObject({
      visible: true,
      message: '操作失败，已回滚',
      tone: 'error',
    })
  })

  it('撤销操作只执行一次并关闭提示', () => {
    const snackbar = useSnackbar()
    const { state, runAction } = useSnackbarState()
    const onUndo = vi.fn()

    snackbar.undo('已删除便签', onUndo)
    expect(state.actionLabel).toBe('撤销')
    runAction()

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(state.visible).toBe(false)
  })

  it('全局组件展示当前提示消息', async () => {
    const wrapper = mount(GlobalSnackbar, { attachTo: document.body })
    useSnackbar().success('已保存')
    await flushPromises()
    await nextTick()

    expect(document.body.textContent).toContain('已保存')
    wrapper.unmount()
  })
})
