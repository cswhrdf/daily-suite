<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  useRoute,
  useRouter,
  type LocationQuery,
  type LocationQueryRaw,
  type LocationQueryValue,
} from 'vue-router'

import type { ApiError } from '@/api/errors'
import type {
  ConvertStickyNoteInput,
  StickyNote,
  StickyNoteFilters,
  StickyNoteInput,
  StickyNoteOrdering,
} from '@/api/stickyNotes'
import AppEmptyState from '@/components/shared/AppEmptyState.vue'
import AppErrorState from '@/components/shared/AppErrorState.vue'
import AppSkeleton from '@/components/shared/AppSkeleton.vue'
import ConvertStickyNoteDialog from '@/components/sticky-notes/ConvertStickyNoteDialog.vue'
import StickyNoteEditDialog from '@/components/sticky-notes/StickyNoteEditDialog.vue'
import StickyNoteMasonry from '@/components/sticky-notes/StickyNoteMasonry.vue'
import StickyNoteQuickAdd from '@/components/sticky-notes/StickyNoteQuickAdd.vue'
import StickyNoteToolbar from '@/components/sticky-notes/StickyNoteToolbar.vue'
import TagManageDialog from '@/components/tags/TagManageDialog.vue'
import { useSnackbar } from '@/composables/useSnackbar'
import { DEFAULT_STICKY_NOTE_FILTERS, useStickyNotesStore } from '@/stores/stickyNotes'
import { useTagsStore } from '@/stores/tags'

const { t } = useI18n()
const route = useRoute()
const router = useRouter()
const store = useStickyNotesStore()
const tagsStore = useTagsStore()
const snackbar = useSnackbar()
const quickAdd = ref<InstanceType<typeof StickyNoteQuickAdd> | null>(null)
const creating = ref(false)
const savingEdit = ref(false)
const converting = ref(false)
const editOpen = ref(false)
const convertOpen = ref(false)
const manageTagsOpen = ref(false)
const convertSource = ref<StickyNote | null>(null)
const editingNote = computed(() =>
  store.editingId === null ? undefined : store.byId(store.editingId),
)
const initialLoading = computed(
  () => store.listRequest.status === 'loading' && store.ordered.length === 0,
)
const initialError = computed(() => store.listRequest.error !== null && store.ordered.length === 0)
// 后端只接受「全部未归档便签」的完整顺序，筛选态下无法安全推断全集，
// 因此标签/搜索筛选与归档视图禁止拖拽，仍可用上移/下移按钮。
const reorderLocked = computed(
  () =>
    store.filters.is_archived || store.filters.tag !== null || store.filters.search.trim() !== '',
)
const reorderHint = computed(() =>
  store.filters.is_archived
    ? t('stickyNotes.masonry.archivedHint')
    : t('stickyNotes.masonry.filteredHint'),
)

function firstQueryValue(
  value: LocationQueryValue | LocationQueryValue[] | undefined,
): LocationQueryValue {
  return (Array.isArray(value) ? value[0] : value) ?? null
}

function filtersFromQuery(query: LocationQuery): StickyNoteFilters {
  const rawTag = firstQueryValue(query['tag'])
  const parsedTag = rawTag === null ? Number.NaN : Number(rawTag)
  const rawOrdering = firstQueryValue(query['ordering'])
  const validOrderings: StickyNoteOrdering[] = ['-is_pinned,position', 'position', '-updated_at']
  const ordering = validOrderings.includes(rawOrdering as StickyNoteOrdering)
    ? (rawOrdering as StickyNoteOrdering)
    : DEFAULT_STICKY_NOTE_FILTERS.ordering
  return {
    tag: Number.isInteger(parsedTag) && parsedTag > 0 ? parsedTag : null,
    search: firstQueryValue(query['search']) ?? '',
    is_archived: firstQueryValue(query['archived']) === '1',
    ordering,
  }
}

function queryFromFilters(filters: StickyNoteFilters): LocationQueryRaw {
  return {
    ...(filters.tag === null ? {} : { tag: String(filters.tag) }),
    ...(filters.search === '' ? {} : { search: filters.search }),
    ...(filters.is_archived ? { archived: '1' } : {}),
    ...(filters.ordering === DEFAULT_STICKY_NOTE_FILTERS.ordering
      ? {}
      : { ordering: filters.ordering }),
  }
}

async function loadFromRoute(): Promise<void> {
  try {
    await store.fetchList(filtersFromQuery(route.query))
  } catch {
    // 请求错误由页面错误态和重试按钮呈现。
  }
}

function updateFilters(patch: Partial<StickyNoteFilters>): void {
  const nextFilters = { ...store.filters, ...patch }
  void router.replace({ query: queryFromFilters(nextFilters) })
}

function clearFilters(): void {
  updateFilters({ ...DEFAULT_STICKY_NOTE_FILTERS })
}

function showFailure(error: unknown): void {
  const apiError = error as ApiError
  snackbar.rollback(t('stickyNotes.feedback.rollback', { message: apiError.message }))
}

async function createNote(input: StickyNoteInput): Promise<void> {
  if (creating.value) {
    return
  }
  creating.value = true
  try {
    const note = await store.create(input)
    if (note !== undefined) {
      quickAdd.value?.reset()
      snackbar.success(t('stickyNotes.feedback.created'))
    }
  } catch (error: unknown) {
    showFailure(error)
  } finally {
    creating.value = false
  }
}

function openEdit(note: StickyNote): void {
  store.editingId = note.id
  editOpen.value = true
}

async function saveEdit(id: number, input: StickyNoteInput): Promise<void> {
  if (savingEdit.value) {
    return
  }
  savingEdit.value = true
  try {
    const note = await store.update(id, input)
    if (note !== undefined) {
      editOpen.value = false
      store.editingId = null
      snackbar.success(t('stickyNotes.feedback.updated'))
    }
  } catch (error: unknown) {
    showFailure(error)
  } finally {
    savingEdit.value = false
  }
}

async function runCardMutation(action: () => Promise<unknown>): Promise<void> {
  try {
    await action()
  } catch (error: unknown) {
    showFailure(error)
  }
}

function openConvert(note: StickyNote): void {
  convertSource.value = note
  convertOpen.value = true
}

async function convertNote(id: number, input: ConvertStickyNoteInput): Promise<void> {
  if (converting.value) {
    return
  }
  converting.value = true
  try {
    const result = await store.convertToTodo(id, input)
    if (result !== undefined) {
      convertOpen.value = false
      convertSource.value = null
      snackbar.successAction(
        t('stickyNotes.feedback.converted'),
        t('stickyNotes.feedback.viewTodo'),
        () => {
          void router.push({ path: '/todos', query: { todo: String(result.todo.id) } })
        },
      )
    }
  } catch (error: unknown) {
    showFailure(error)
  } finally {
    converting.value = false
  }
}

async function loadTags(): Promise<void> {
  try {
    await tagsStore.fetchAll()
  } catch {
    // 标签筛选组件保留已有状态；主便签列表不受标签请求失败影响。
  }
}

watch(
  () => route.query,
  () => {
    void loadFromRoute()
  },
  { immediate: true },
)
onMounted(() => {
  if (tagsStore.listRequest.status === 'idle') {
    void loadTags()
  }
})
</script>

<template>
  <section class="sticky-notes-view">
    <header class="sticky-notes-view-header">
      <div>
        <p class="sticky-notes-view-eyebrow">{{ t('stickyNotes.page.eyebrow') }}</p>
        <h1 class="text-h4">{{ t('stickyNotes.page.title') }}</h1>
        <p class="text-body-2 text-medium-emphasis">{{ t('stickyNotes.page.subtitle') }}</p>
      </div>
      <v-btn
        color="primary"
        prepend-icon="mdi-tag-edit-outline"
        variant="text"
        @click="manageTagsOpen = true"
      >
        {{ t('tags.manage.action') }}
      </v-btn>
    </header>

    <sticky-note-quick-add
      ref="quickAdd"
      :saving="creating"
      :tags="tagsStore.ordered"
      @submit="createNote"
    />

    <sticky-note-toolbar
      :archived="store.filters.is_archived"
      :archived-count="store.archived.length"
      :count="store.visible.length"
      :pinned-first="store.filters.ordering === '-is_pinned,position'"
      :search="store.filters.search"
      :selected-tag="store.filters.tag"
      :tags="tagsStore.ordered"
      :tags-loading="tagsStore.listRequest.status === 'loading'"
      @clear="clearFilters"
      @update:archived="updateFilters({ is_archived: $event })"
      @update:pinned-first="
        updateFilters({ ordering: $event ? '-is_pinned,position' : 'position' })
      "
      @update:search="updateFilters({ search: $event })"
      @update:selected-tag="updateFilters({ tag: $event })"
    />

    <div v-if="initialLoading" class="sticky-notes-view-skeletons" data-test="sticky-notes-loading">
      <app-skeleton v-for="index in 4" :key="index" height="190" type="article" />
    </div>
    <app-error-state
      v-else-if="initialError"
      :message="store.listRequest.error?.message ?? t('apiErrors.unknown')"
      @retry="loadFromRoute"
    />
    <app-empty-state
      v-else-if="store.visible.length === 0"
      :description="
        store.ordered.length === 0
          ? t('stickyNotes.empty.description')
          : t('stickyNotes.empty.filtered')
      "
      icon="mdi-note-text-outline"
      :title="
        store.ordered.length === 0
          ? t('stickyNotes.empty.title')
          : t('stickyNotes.empty.filteredTitle')
      "
    >
      <template v-if="store.ordered.length > 0" #action>
        <v-btn color="primary" variant="outlined" @click="clearFilters">
          {{ t('stickyNotes.toolbar.clear') }}
        </v-btn>
      </template>
    </app-empty-state>
    <details v-else-if="store.filters.is_archived" class="sticky-notes-view-archive" open>
      <summary>
        <v-icon aria-hidden="true" icon="mdi-archive" />
        {{ t('stickyNotes.archiveRegion.title', { count: store.visible.length }) }}
      </summary>
      <sticky-note-masonry
        :hint="reorderHint"
        :notes="store.visible"
        :pending-ids="store.mutationPendingIds"
        :sortable="!reorderLocked"
        @archive="runCardMutation(() => store.archive($event.id))"
        @convert="openConvert"
        @edit="openEdit"
        @reorder="runCardMutation(() => store.reorder($event))"
        @restore="runCardMutation(() => store.restore($event.id))"
        @toggle-pin="runCardMutation(() => store.togglePin($event.id))"
      />
    </details>
    <sticky-note-masonry
      v-else
      :hint="reorderHint"
      :notes="store.visible"
      :pending-ids="store.mutationPendingIds"
      :sortable="!reorderLocked"
      @archive="runCardMutation(() => store.archive($event.id))"
      @convert="openConvert"
      @edit="openEdit"
      @reorder="runCardMutation(() => store.reorder($event))"
      @restore="runCardMutation(() => store.restore($event.id))"
      @toggle-pin="runCardMutation(() => store.togglePin($event.id))"
    />

    <sticky-note-edit-dialog
      v-if="editingNote !== undefined"
      v-model="editOpen"
      :note="editingNote"
      :saving="savingEdit"
      :tags="tagsStore.ordered"
      @save="saveEdit"
    />
    <convert-sticky-note-dialog
      v-if="convertSource !== null"
      v-model="convertOpen"
      :note="convertSource"
      :saving="converting"
      @confirm="convertNote"
    />
    <tag-manage-dialog v-model="manageTagsOpen" />
  </section>
</template>

<style scoped>
.sticky-notes-view-header {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 24px;
}

.sticky-notes-view-header h1 {
  font-weight: 750;
}

.sticky-notes-view-header p:last-child {
  margin: 6px 0 0;
}

.sticky-notes-view-eyebrow {
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 12px;
  letter-spacing: 2px;
}

.sticky-notes-view-skeletons {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

.sticky-notes-view-archive {
  overflow: hidden;
  background: rgb(var(--v-theme-surface-variant));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 15px;
}

.sticky-notes-view-archive summary {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 16px 20px;
  font-weight: 650;
  cursor: pointer;
}

.sticky-notes-view-archive .sticky-note-masonry {
  padding: 0 20px 20px;
}
</style>
