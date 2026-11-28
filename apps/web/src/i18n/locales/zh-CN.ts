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
  tags: {
    toolbar: {
      label: '标签工具',
    },
    filter: {
      label: '筛选标签',
      all: '全部标签',
      clear: '清除筛选',
      empty: '暂无可用标签，请先创建。',
    },
    chip: {
      listLabel: '标签列表',
    },
    manage: {
      action: '管理标签',
      title: '管理标签',
      close: '关闭标签管理',
      existing: '已有标签',
      emptyTitle: '还没有标签',
      empty: '在下方创建第一个标签，供便签、待办和日历共同使用。',
      edit: '编辑标签“{name}”',
      delete: '删除标签“{name}”',
    },
    form: {
      createTitle: '新建标签',
      editTitle: '编辑标签',
      name: '标签名称',
      namePlaceholder: '例如：家庭',
      nameRequired: '请输入标签名称。',
      color: '标签颜色',
      colorOption: '使用颜色 {color}',
      selectedColor: '已选颜色：{color}',
      cancelEdit: '取消编辑',
      create: '新建标签',
      save: '保存修改',
    },
    delete: {
      title: '确认删除标签？',
      message: '即将删除标签“{name}”。此操作只解除关联，不删除便签、待办或日程。',
      associations: '关联的便签、待办和日程内容都会保留。',
      cancel: '取消',
      confirm: '确认删除',
    },
    feedback: {
      created: '标签已创建。',
      updated: '标签已保存。',
      removed: '标签已删除，关联已解除。',
      rollback: '操作失败，已恢复原状态：{message}',
    },
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
