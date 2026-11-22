import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { describe, expect, it } from 'vitest'

import App from './App.vue'
import vuetify from './plugins/vuetify'
import router from './router'

describe('App', () => {
  it('渲染 Vuetify 布局并应用主题色', async () => {
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [vuetify, createPinia(), router],
      },
    })
    await flushPromises()

    // v-app 渲染为 .v-application，证明 Vuetify 组件链路可用。
    expect(wrapper.find('.v-application').exists()).toBe(true)
    expect(wrapper.find('.v-app-bar').exists()).toBe(true)

    // color="primary" 会被 Vuetify 解析为 bg-primary，证明主题 token 生效。
    const primaryButton = wrapper
      .findAll('.v-btn')
      .find((button) => button.classes().includes('bg-primary'))
    expect(primaryButton).toBeDefined()
    expect(primaryButton?.text()).toContain('主按钮')

    expect(wrapper.html()).toContain('Daily Suite 前端脚手架')

    // 自定义主题色来自 createVuetify 配置，而非 Vuetify 默认值。
    const theme = vuetify.theme.themes.value['light']
    expect(theme?.colors.primary).toBe('#1867C0')
  })
})
