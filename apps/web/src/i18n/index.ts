/**
 * 应用国际化入口。
 *
 * - `locale` 是唯一来源：界面文案与 Vuetify 内置文案都跟随它变化；
 * - 默认语言为简体中文，缺失的 key 回退到简体中文；
 * - vue-i18n 使用 `zh-CN` / `en` 这类 BCP 47 标识，Vuetify 4 使用
 *   `zh-Hans` / `en`，两者的差异由 `toVuetifyLocale` 统一收敛。
 */
import { createI18n } from 'vue-i18n'

import en from './locales/en'
import zhCN from './locales/zh-CN'

/** vue-i18n locale -> Vuetify locale 的映射表（Vuetify 用 BCP 47）。 */
const VUETIFY_LOCALES = {
  'zh-CN': 'zh-Hans',
  en: 'en',
} satisfies Record<string, string>

/** 应用支持的 locale 标识（即 vue-i18n 侧使用的标识）。 */
export type AppLocale = keyof typeof VUETIFY_LOCALES

/** 默认语言。 */
export const DEFAULT_LOCALE: AppLocale = 'zh-CN'

/** 判断任意字符串是否为受支持的 locale。 */
export function isAppLocale(value: string): value is AppLocale {
  return Object.hasOwn(VUETIFY_LOCALES, value)
}

/** 把 vue-i18n 的 locale 映射为 Vuetify 的 locale，未知值回退到默认语言。 */
export function toVuetifyLocale(locale: string): string {
  return isAppLocale(locale) ? VUETIFY_LOCALES[locale] : VUETIFY_LOCALES[DEFAULT_LOCALE]
}

const i18n = createI18n({
  // Composition API 模式：模板里可直接用 $t，脚本里用 useI18n()。
  legacy: false,
  locale: DEFAULT_LOCALE,
  fallbackLocale: DEFAULT_LOCALE,
  messages: {
    'zh-CN': zhCN,
    en,
  },
})

export default i18n
