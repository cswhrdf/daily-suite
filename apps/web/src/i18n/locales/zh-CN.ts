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
  nav: {
    label: '主导航',
    home: '首页',
    stickyNotes: '便签',
    todos: '待办',
    calendar: '日历',
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
  stickyNotes: {
    description: '便签功能将在后续阶段提供。',
  },
  todos: {
    description: '待办功能将在后续阶段提供。',
  },
  calendar: {
    description: '日历功能将在后续阶段提供。',
  },
  state: {
    errorTitle: '加载失败',
    retry: '重试',
  },
  snackbar: {
    undo: '撤销',
    dismiss: '关闭提示',
  },
  apiErrors: {
    network: '网络连接失败，请检查网络后重试。',
    unauthorized: '登录状态已失效，请重新登录。',
    forbidden: '没有权限执行此操作。',
    notFound: '请求的资源不存在或已被删除。',
    conflict: '数据已发生变化，请刷新后重试。',
    validation: '提交内容不符合要求，请检查后重试。',
    rateLimited: '操作过于频繁，请稍后重试。',
    server: '服务暂时不可用，请稍后重试。',
    unknown: '发生未知错误，请稍后重试。',
  },
}

export default zhCN
