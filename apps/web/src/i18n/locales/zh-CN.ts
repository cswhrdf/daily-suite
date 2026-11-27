/**
 * 简体中文文案（基准语言）。
 *
 * 按页面 / 领域分组，避免扁平散落；新增文案必须同步补齐 `en.ts` 的同名 key。
 * 这里的 msgid 即界面默认展示的中文，后续接入其他语言时以本文件为参照。
 */
const zhCN = {
  app: {
    title: 'Daily Suite',
  },
  login: {
    title: '登录 Daily Suite',
    username: '用户名',
    password: '密码',
    submit: '登录',
    error: '用户名或密码错误，请重试。',
  },
  home: {
    title: 'Daily Suite 前端脚手架',
    intro: '基础工程已就绪，当前具备以下能力：',
    features: {
      vue: 'Vue 3 + TypeScript + Vite',
      vuetify: 'Vuetify 3 组件与主题',
      router: 'Vue Router 4 路由',
      pinia: 'Pinia 状态管理',
    },
    primaryAction: '主按钮',
    secondaryAction: '次按钮',
  },
}

export default zhCN
