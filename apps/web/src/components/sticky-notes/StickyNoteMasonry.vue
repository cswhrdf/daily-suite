<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { VueDraggable } from 'vue-draggable-plus'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

import type { StickyNote } from '@/api/stickyNotes'
import StickyNoteCard from '@/components/sticky-notes/StickyNoteCard.vue'

const props = withDefaults(
  defineProps<{
    notes: readonly StickyNote[]
    pendingIds: ReadonlySet<string>
    sortable?: boolean
    hint?: string
  }>(),
  { hint: '', sortable: true },
)

const emit = defineEmits<{
  archive: [note: StickyNote]
  convert: [note: StickyNote]
  edit: [note: StickyNote]
  reorder: [orderedIds: number[]]
  restore: [note: StickyNote]
  togglePin: [note: StickyNote]
}>()

/** 每列只包一层对象，模板才能对 `column.notes` 稳定使用 v-model。 */
interface StickyNoteColumn {
  notes: StickyNote[]
}

const { t } = useI18n()
const { lgAndUp, mdAndUp, smAndDown, xlAndUp } = useDisplay()
const columns = ref<StickyNoteColumn[]>([])
const columnCount = computed(() => {
  if (xlAndUp.value) {
    return 5
  }
  if (lgAndUp.value) {
    return 3
  }
  if (mdAndUp.value) {
    return 2
  }
  return smAndDown.value ? 1 : 2
})
const flatIds = computed(() => props.notes.map((note) => note.id))

function distribute(): void {
  const count = columnCount.value
  columns.value = Array.from({ length: count }, (_unused, columnIndex) => ({
    notes: props.notes.filter((_note, noteIndex) => noteIndex % count === columnIndex),
  }))
}

function emitCurrentOrder(): void {
  emit(
    'reorder',
    columns.value.flatMap((column) => column.notes.map((note) => note.id)),
  )
}

function move(id: number, direction: -1 | 1): void {
  const from = flatIds.value.indexOf(id)
  const to = from + direction
  if (from < 0 || to < 0 || to >= flatIds.value.length) {
    return
  }
  const orderedIds = [...flatIds.value]
  orderedIds.splice(from, 1)
  orderedIds.splice(to, 0, id)
  emit('reorder', orderedIds)
}

watch([() => props.notes, columnCount], distribute, { immediate: true })
defineExpose({ distribute, emitCurrentOrder, move })
</script>

<template>
  <div
    :aria-label="t('stickyNotes.masonry.label')"
    class="sticky-note-masonry"
    :style="{ '--sticky-note-columns': columnCount }"
  >
    <p v-if="!sortable" class="sticky-note-masonry-hint" data-test="sticky-note-reorder-hint">
      <v-icon aria-hidden="true" icon="mdi-information-outline" size="16" />
      {{ hint }}
    </p>
    <vue-draggable
      v-for="(column, columnIndex) in columns"
      :key="columnIndex"
      v-model="column.notes"
      :animation="160"
      class="sticky-note-masonry-column"
      :data-test="`sticky-note-column-${columnIndex}`"
      :disabled="!sortable"
      drag-class="sticky-note-masonry-dragging"
      ghost-class="sticky-note-masonry-ghost"
      group="sticky-notes"
      handle=".sticky-note-card-drag-handle"
      item-key="id"
      scroll
      :scroll-sensitivity="80"
      :scroll-speed="12"
      @end="emitCurrentOrder"
    >
      <sticky-note-card
        v-for="note in column.notes"
        :key="note.id"
        :busy="pendingIds.has(String(note.id)) || pendingIds.has('reorder')"
        :index="flatIds.indexOf(note.id)"
        :note="note"
        :sortable="sortable"
        :total="notes.length"
        @archive="emit('archive', note)"
        @convert="emit('convert', note)"
        @edit="emit('edit', note)"
        @move="move"
        @restore="emit('restore', note)"
        @toggle-pin="emit('togglePin', note)"
      />
    </vue-draggable>
  </div>
</template>

<style scoped>
.sticky-note-masonry {
  display: grid;
  grid-template-columns: repeat(var(--sticky-note-columns), minmax(0, 1fr));
  gap: 20px;
  align-items: start;
  width: 100%;
}

.sticky-note-masonry-hint {
  display: flex;
  grid-column: 1 / -1;
  gap: 6px;
  align-items: center;
  margin: 0;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 13px;
}

.sticky-note-masonry-column {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  min-height: 80px;
}

:deep(.sticky-note-masonry-ghost) {
  opacity: 0.45;
  outline: 2px dashed rgb(var(--v-theme-secondary));
  outline-offset: -4px;
}

:deep(.sticky-note-masonry-dragging) {
  cursor: grabbing;
  box-shadow: 0 12px 28px rgb(32 36 43 / 18%);
}
</style>
