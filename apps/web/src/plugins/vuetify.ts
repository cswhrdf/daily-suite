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
          'on-primary': '#FFFFFF',
          secondary: '#C2410C',
          'on-secondary': '#FFFFFF',
          background: '#FFF8F2',
          surface: '#FFFFFF',
          'surface-variant': '#F3F0ED',
          'on-background': '#20242B',
          'on-surface': '#20242B',
          'on-surface-variant': '#5D6470',
          outline: '#D8D4D0',
          'primary-container': '#DCEAFF',
          'on-primary-container': '#0C2D4D',
          'secondary-container': '#FFE7D6',
          'on-secondary-container': '#571E04',
          error: '#BA1A1A',
          'on-error': '#FFFFFF',
          warning: '#8A5A00',
          'on-warning': '#FFFFFF',
          success: '#217A46',
          'on-success': '#FFFFFF',
          info: '#1867C0',
          'on-info': '#FFFFFF',
        },
      },
      dark: {
        dark: true,
        colors: {
          primary: '#FF9B66',
          'on-primary': '#351505',
          secondary: '#8AB8FF',
          'on-secondary': '#082B4C',
          background: '#111418',
          surface: '#1B1E23',
          'surface-variant': '#2A2E35',
          'on-background': '#F4F5F7',
          'on-surface': '#F4F5F7',
          'on-surface-variant': '#BBC2CC',
          outline: '#4A515B',
          'primary-container': '#5B2A12',
          'on-primary-container': '#FFE8DB',
          'secondary-container': '#173C63',
          'on-secondary-container': '#DCEAFF',
          error: '#FFB4AB',
          'on-error': '#690005',
          warning: '#F4C860',
          'on-warning': '#3F2E00',
          success: '#8FD5A6',
          'on-success': '#00391B',
          info: '#8AB8FF',
          'on-info': '#082B4C',
        },
      },
    },
  },
})

export default vuetify
