/**
 * English messages.
 *
 * 结构与 `zh-CN.ts` 一一对应：先铺满 key 骨架，文案可逐步打磨。
 * 缺失的 key 会回退到 `zh-CN`（见 `i18n/index.ts` 的 `fallbackLocale`）。
 */
const en = {
  app: {
    title: 'Daily Suite',
  },
  login: {
    title: 'Sign in to Daily Suite',
    username: 'Username',
    password: 'Password',
    submit: 'Sign in',
    error: 'Incorrect username or password. Please try again.',
  },
  home: {
    title: 'Daily Suite frontend scaffold',
    intro: 'The base project is ready and currently ships with:',
    features: {
      vue: 'Vue 3 + TypeScript + Vite',
      vuetify: 'Vuetify 3 components and theming',
      router: 'Vue Router 4 routing',
      pinia: 'Pinia state management',
    },
    primaryAction: 'Primary action',
    secondaryAction: 'Secondary action',
  },
}

export default en
