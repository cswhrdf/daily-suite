import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, describe, expect, it } from 'vitest'

import App from '@/App.vue'
import { setAccessToken } from '@/api/token'
import vuetify from '@/plugins/vuetify'
import router from '@/router'

afterEach(() => {
  setAccessToken(null)
})

describe('App', () => {
  it('渲染 Vuetify 布局并应用主题色', async () => {
    // 首页为受保护路由：先激活 Pinia 并预置内存 Token，
    // 避免守卫在 app.use(pinia) 之前触发，也避免真实刷新请求。
    const pinia = createPinia()
    setActivePinia(pinia)
    setAccessToken('test-access')
    await router.push('/')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        // Vuetify 与 i18n 由全局 setup 注入，这里仅补充认证状态和路由。
        plugins: [pinia, router],
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
    expect(theme?.colors.secondary).toBe('#C2410C')
    expect(theme?.colors['primary-container']).toBe('#DCEAFF')
    expect(theme?.colors['on-primary-container']).toBe('#0C2D4D')
    expect(theme?.colors['secondary-container']).toBe('#FFE7D6')
    expect(theme?.colors['on-secondary-container']).toBe('#571E04')
    expect(theme?.colors.info).toBe('#1867C0')
    expect(vuetify.theme.themes.value['dark']?.colors['on-primary']).toBe('#351505')

    wrapper.unmount()
  })
})
