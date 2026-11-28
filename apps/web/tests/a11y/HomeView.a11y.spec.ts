import { mount } from '@vue/test-utils'
import { describe, it } from 'vitest'

import HomeView from '@/views/HomeView.vue'

import { componentAxeOptions, expectNoA11yViolations } from './axe-helper'

/**
 * 组件级 a11y 冒烟：把真实组件挂到 document 上再跑 axe，
 * 保证渲染结果（含 Vuetify 生成的 ARIA 结构）满足规则集。
 */
describe('HomeView 可访问性', () => {
  it('渲染结果无 axe 违规', async () => {
    const wrapper = mount(HomeView, {
      // Vuetify 与 i18n 由全局 setup 注入。
      // axe 只能扫描挂载在 document 上的节点，默认的游离容器会被跳过。
      attachTo: document.body,
    })

    try {
      await expectNoA11yViolations(wrapper.element as Element, componentAxeOptions)
    } finally {
      wrapper.unmount()
    }
  })
})
