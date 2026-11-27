import '@mdi/font/css/materialdesignicons.css'
import 'vuetify/styles'

import { createPinia } from 'pinia'
import { createApp, watch } from 'vue'

import App from './App.vue'
import i18n, { toVuetifyLocale } from './i18n'
import vuetify from './plugins/vuetify'
import router from './router'

const app = createApp(App)

app.use(createPinia())
app.use(i18n)
app.use(router)
app.use(vuetify)

// vue-i18n 的 locale 是唯一来源：语言变化时同步 Vuetify 内置组件文案。
// immediate 保证首屏即按当前语言初始化，而不是依赖两处默认值恰好一致。
watch(
  () => i18n.global.locale.value,
  (locale) => {
    vuetify.locale.current.value = toVuetifyLocale(locale)
  },
  { immediate: true },
)

app.mount('#app')
