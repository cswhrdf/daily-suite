import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import { VApp, VBottomNavigation } from 'vuetify/components'

import AppBottomNavigation from '@/components/layout/AppBottomNavigation.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import type { NavItem } from '@/router/nav'

const display = vi.hoisted(() => ({ smAndDown: true, mdAndUp: false }))

vi.mock('vuetify', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vuetify')>()
  return {
    ...actual,
    useDisplay: () => ({
      smAndDown: display.smAndDown,
      mdAndUp: display.mdAndUp,
    }),
  }
})

const page = defineComponent({ template: '<div />' })
const items: NavItem[] = [
  { title: 'nav.home', to: '/' },
  { title: 'nav.todos', to: '/todos' },
]

async function testRouter(path: string, title?: string): Promise<Router> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: page, meta: title === undefined ? {} : { title } },
      { path: '/todos', component: page },
      { path: '/other', component: page },
    ],
  })
  await router.push(path)
  await router.isReady()
  return router
}

beforeEach(() => {
  display.smAndDown = true
  display.mdAndUp = false
})

afterEach(() => {
  document.body.innerHTML = ''
})

describe('AppBottomNavigation', () => {
  it('移动端渲染导航项并选中当前路径', async () => {
    const router = await testRouter('/todos')
    const wrapper = mount(VApp, {
      slots: { default: () => h(AppBottomNavigation, { items }) },
      global: { plugins: [router] },
      attachTo: document.body,
    })
    await flushPromises()

    const navigation = wrapper.findComponent(VBottomNavigation)
    expect(navigation.exists()).toBe(true)
    expect(navigation.props('modelValue')).toBe('/todos')
    expect(wrapper.findAll('.v-btn').map((button) => button.text())).toEqual(['首页', '待办'])
    wrapper.unmount()
  })

  it('当前路径不在清单时清空选中值，桌面端不渲染', async () => {
    const unmatchedRouter = await testRouter('/other')
    const unmatched = mount(VApp, {
      slots: { default: () => h(AppBottomNavigation, { items }) },
      global: { plugins: [unmatchedRouter] },
    })
    expect(unmatched.findComponent(VBottomNavigation).props('modelValue')).toBe('')
    unmatched.unmount()

    display.smAndDown = false
    display.mdAndUp = true
    const desktopRouter = await testRouter('/')
    const desktop = mount(VApp, {
      slots: { default: () => h(AppBottomNavigation, { items }) },
      global: { plugins: [desktopRouter] },
    })
    expect(desktop.findComponent(VBottomNavigation).exists()).toBe(false)
    desktop.unmount()
  })
})

describe('AppHeader', () => {
  it('使用路由标题，缺少标题时回退应用名称', async () => {
    const titledRouter = await testRouter('/', 'nav.todos')
    const titled = mount(VApp, {
      slots: { default: () => h(AppHeader) },
      global: { plugins: [titledRouter] },
    })
    expect(titled.text()).toContain('待办')
    titled.unmount()

    const fallbackRouter = await testRouter('/other')
    const fallback = mount(VApp, {
      slots: { default: () => h(AppHeader) },
      global: { plugins: [fallbackRouter] },
    })
    expect(fallback.text()).toContain('Daily Suite')
    fallback.unmount()
  })
})
