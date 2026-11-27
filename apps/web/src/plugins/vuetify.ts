import { createVuetify } from 'vuetify'
import { en as vuetifyEn, zhHans } from 'vuetify/locale'

import { DEFAULT_LOCALE, toVuetifyLocale } from '@/i18n'

const vuetify = createVuetify({
  // Vuetify 内置组件文案（分页、日期选择器、v-select 空态等）。
  // 初始值跟随 vue-i18n 的默认 locale，运行时由 main.ts 的 watch 保持同步；
  // Vuetify 使用 BCP 47 标识（zh-Hans / en），与 vue-i18n 的 zh-CN / en 不同。
  locale: {
    locale: toVuetifyLocale(DEFAULT_LOCALE),
    fallback: 'en',
    messages: {
      'zh-Hans': zhHans,
      en: vuetifyEn,
    },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        dark: false,
        colors: {
          primary: '#1867C0',
          secondary: '#5CBBF6',
          surface: '#FFFFFF',
        },
      },
    },
  },
})

export default vuetify
