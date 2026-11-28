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
    page: {
      eyebrow: 'DAILY-SUITE · STICKY NOTES',
      title: 'Notes · Quick capture workspace',
      subtitle: 'Quick entry + persistently ordered masonry',
    },
    quickAdd: {
      title: 'What would you like to capture?',
      subtitle: 'Plain text first, with fewer steps from idea to note',
      contentPlaceholder: 'Write an idea, checklist, or temporary detail…',
      shortcut: '{mod} + Enter to save',
      save: 'Save note',
    },
    form: {
      title: 'Title (optional)',
      titlePlaceholder: 'Give this note a short title',
      content: 'Content',
      contentRequired: 'The title and content cannot both be empty.',
      color: 'Card color',
      colorOption: 'Use note color {color}',
      tags: 'Tags',
    },
    toolbar: {
      label: 'Note filters',
      search: 'Search current notes',
      pinnedFirst: 'Pinned first',
      archived: 'Archived {count}',
      clear: 'Clear filters',
      summary: '{count} notes · Drag a card handle to reorder',
    },
    masonry: {
      label: 'Note masonry',
      filteredHint:
        'Reordering is disabled while filters are active; use the move up / down buttons.',
      archivedHint: 'Archived notes cannot be reordered; restore a note to adjust its position.',
    },
    card: {
      untitled: 'Untitled note',
      pinned: 'Pinned',
      archived: 'Archived',
      plainText: 'Plain text',
      clickEdit: 'Click to edit',
      edit: 'Edit note “{title}”',
      drag: 'Drag note “{title}” to reorder',
      moveUp: 'Move note “{title}” up',
      moveDown: 'Move note “{title}” down',
      pin: 'Pin note “{title}”',
      unpin: 'Unpin note “{title}”',
      archive: 'Archive note “{title}”',
      restore: 'Restore note “{title}”',
      convert: 'Convert to to-do',
    },
    edit: {
      title: 'Edit note',
      close: 'Close note editor',
      cancel: 'Cancel',
      save: 'Save changes',
      discardTitle: 'Discard unsaved changes?',
      discardMessage: 'Your changes have not been saved and will be lost when you close.',
      keepEditing: 'Keep editing',
      discard: 'Discard changes',
    },
    convert: {
      title: 'Convert note to to-do',
      close: 'Close to-do conversion',
      description: 'Add a due date and priority. The source note and to-do stay linked.',
      emptySource: 'The source note has no content.',
      dueAt: 'Due date (optional)',
      priority: 'Priority',
      priorityLow: 'Low',
      priorityMedium: 'Medium',
      priorityHigh: 'High',
      cancel: 'Cancel',
      confirm: 'Convert',
    },
    empty: {
      title: 'No notes yet',
      description: 'Capture your first idea above and it will appear here.',
      filteredTitle: 'No matching notes',
      filtered: 'Try another search, tag, or archive state.',
    },
    archiveRegion: {
      title: 'Archived notes · {count}',
    },
    feedback: {
      created: 'Note saved.',
      updated: 'Note changes saved.',
      converted: 'Note converted to a to-do.',
      viewTodo: 'View to-do',
      rollback: 'The operation failed and the previous state was restored: {message}',
    },
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
