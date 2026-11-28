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
  nav: {
    label: 'Main navigation',
    home: 'Home',
    stickyNotes: 'Notes',
    todos: 'To-dos',
    calendar: 'Calendar',
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
  stickyNotes: {
    description: 'Notes will be available in a later stage.',
  },
  todos: {
    description: 'To-dos will be available in a later stage.',
  },
  calendar: {
    description: 'Calendar will be available in a later stage.',
  },
  tags: {
    toolbar: {
      label: 'Tag tools',
    },
    filter: {
      label: 'Filter by tag',
      all: 'All tags',
      clear: 'Clear filter',
      empty: 'No tags available. Create one first.',
    },
    chip: {
      listLabel: 'Tag list',
    },
    manage: {
      action: 'Manage tags',
      title: 'Manage tags',
      close: 'Close tag management',
      existing: 'Existing tags',
      emptyTitle: 'No tags yet',
      empty: 'Create your first tag below to share it across notes, to-dos, and calendar.',
      edit: 'Edit tag “{name}”',
      delete: 'Delete tag “{name}”',
    },
    form: {
      createTitle: 'New tag',
      editTitle: 'Edit tag',
      name: 'Tag name',
      namePlaceholder: 'For example: Family',
      nameRequired: 'Enter a tag name.',
      color: 'Tag color',
      colorOption: 'Use color {color}',
      selectedColor: 'Selected color: {color}',
      cancelEdit: 'Cancel editing',
      create: 'Create tag',
      save: 'Save changes',
    },
    delete: {
      title: 'Delete this tag?',
      message:
        'You are about to delete “{name}”. This only removes associations; notes, to-dos, and events will not be deleted.',
      associations: 'All associated notes, to-dos, and events will be preserved.',
      cancel: 'Cancel',
      confirm: 'Delete tag',
    },
    feedback: {
      created: 'Tag created.',
      updated: 'Tag saved.',
      removed: 'Tag deleted and associations removed.',
      rollback: 'The operation failed and your previous state was restored: {message}',
    },
  },
  state: {
    errorTitle: 'Unable to load',
    retry: 'Retry',
  },
  snackbar: {
    undo: 'Undo',
    dismiss: 'Dismiss notification',
  },
  apiErrors: {
    network: 'Network connection failed. Check your connection and try again.',
    unauthorized: 'Your session has expired. Please sign in again.',
    forbidden: 'You do not have permission to perform this action.',
    notFound: 'The requested resource does not exist or has been deleted.',
    conflict: 'The data has changed. Refresh and try again.',
    validation: 'The submitted data is invalid. Check it and try again.',
    rateLimited: 'Too many requests. Please try again later.',
    server: 'The service is temporarily unavailable. Please try again later.',
    unknown: 'An unexpected error occurred. Please try again later.',
  },
}

export default en
