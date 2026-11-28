<script setup lang="ts">
import { computed, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'

import type { StickyNote } from '@/api/stickyNotes'
import TagChipList from '@/components/tags/TagChipList.vue'
import type { Tag } from '@/api/tags'

const props = withDefaults(
  defineProps<{
    note: StickyNote
    index: number
    total: number
    busy?: boolean
    sortable?: boolean
  }>(),
  { busy: false, sortable: true },
)

const emit = defineEmits<{
  archive: [note: StickyNote]
  convert: [note: StickyNote]
  edit: [note: StickyNote]
  move: [id: number, direction: -1 | 1]
  restore: [note: StickyNote]
  togglePin: [note: StickyNote]
}>()

const { locale, t } = useI18n()
const cardStyle = computed<CSSProperties>(() => ({ '--sticky-note-color': props.note.color }))
const displayTitle = computed(() =>
  props.note.title.trim() === '' ? t('stickyNotes.card.untitled') : props.note.title,
)
const updatedAt = computed(() =>
  new Intl.DateTimeFormat(locale.value, { dateStyle: 'medium' }).format(
    new Date(props.note.updated_at),
  ),
)
const tagEntities = computed<Tag[]>(() =>
  props.note.tags.map((tag) => ({
    ...tag,
    created_at: '',
    updated_at: '',
  })),
)
</script>

<template>
  <article
    class="sticky-note-card"
    :class="{ 'sticky-note-card-pinned': note.is_pinned }"
    :data-test="`sticky-note-card-${note.id}`"
    :style="cardStyle"
  >
    <header v-if="note.is_pinned || note.is_archived" class="sticky-note-card-header">
      <span v-if="note.is_pinned" class="sticky-note-card-status sticky-note-card-pinned-label">
        <v-icon aria-hidden="true" class="sticky-note-pin-icon" icon="mdi-pin" size="15" />
        {{ t('stickyNotes.card.pinned') }}
      </span>
      <span v-else-if="note.is_archived" class="sticky-note-card-status">
        <v-icon aria-hidden="true" icon="mdi-archive" size="15" />
        {{ t('stickyNotes.card.archived') }}
      </span>
    </header>

    <button
      :aria-label="t('stickyNotes.card.edit', { title: displayTitle })"
      class="sticky-note-card-edit"
      :data-test="`sticky-note-edit-${note.id}`"
      :disabled="busy"
      type="button"
      @click="emit('edit', note)"
    >
      <h3 class="text-h6">{{ displayTitle }}</h3>
      <p v-if="note.content !== ''" class="sticky-note-card-content">{{ note.content }}</p>
      <span class="sticky-note-card-date"
        >{{ updatedAt }} · {{ t('stickyNotes.card.clickEdit') }}</span
      >
    </button>

    <button
      v-if="sortable"
      :aria-label="t('stickyNotes.card.drag', { title: displayTitle })"
      class="sticky-note-card-drag-handle"
      :data-test="`sticky-note-drag-${note.id}`"
      :disabled="busy"
      type="button"
    >
      <v-icon aria-hidden="true" icon="mdi-drag" />
    </button>

    <tag-chip-list v-if="note.tags.length > 0" class="sticky-note-card-tags" :tags="tagEntities" />

    <footer class="sticky-note-card-footer">
      <v-btn
        color="primary"
        data-test="sticky-note-convert"
        :disabled="busy"
        size="small"
        variant="outlined"
        @click="emit('convert', note)"
      >
        {{ t('stickyNotes.card.convert') }}
        <v-icon aria-hidden="true" end icon="mdi-arrow-right" size="16" />
      </v-btn>
      <div class="sticky-note-card-actions">
        <v-btn
          :aria-label="t('stickyNotes.card.moveUp', { title: displayTitle })"
          :disabled="busy || index === 0"
          icon="mdi-arrow-up"
          size="x-small"
          variant="text"
          @click="emit('move', note.id, -1)"
        />
        <v-btn
          :aria-label="t('stickyNotes.card.moveDown', { title: displayTitle })"
          :disabled="busy || index === total - 1"
          icon="mdi-arrow-down"
          size="x-small"
          variant="text"
          @click="emit('move', note.id, 1)"
        />
        <v-btn
          :aria-label="
            t(note.is_pinned ? 'stickyNotes.card.unpin' : 'stickyNotes.card.pin', {
              title: displayTitle,
            })
          "
          class="sticky-note-pin-button"
          :disabled="busy"
          :icon="note.is_pinned ? 'mdi-pin-off' : 'mdi-pin-outline'"
          size="x-small"
          variant="text"
          @click="emit('togglePin', note)"
        />
        <v-btn
          v-if="note.is_archived"
          :aria-label="t('stickyNotes.card.restore', { title: displayTitle })"
          :disabled="busy"
          icon="mdi-archive-arrow-up"
          size="x-small"
          variant="text"
          @click="emit('restore', note)"
        />
        <v-btn
          v-else
          :aria-label="t('stickyNotes.card.archive', { title: displayTitle })"
          :disabled="busy"
          icon="mdi-archive-arrow-down"
          size="x-small"
          variant="text"
          @click="emit('archive', note)"
        />
      </div>
    </footer>
  </article>
</template>

<style scoped>
.sticky-note-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  padding: 18px;
  color: #20242b;
  overflow: hidden;
  background: var(--sticky-note-color);
  border: 1px solid color-mix(in srgb, var(--sticky-note-color) 80%, #8d857d);
  border-radius: 13px;
  transition: box-shadow 160ms ease;
}

.sticky-note-card:hover {
  box-shadow: 0 5px 18px rgb(32 36 43 / 10%);
}

.sticky-note-card-pinned {
  border-color: color-mix(in srgb, var(--sticky-note-color) 65%, #c2410c);
}

.sticky-note-card-header,
.sticky-note-card-footer,
.sticky-note-card-actions {
  display: flex;
  align-items: center;
}

.sticky-note-card-header {
  min-height: 26px;
}

.sticky-note-card-status {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  color: #5d6470;
  font-size: 12px;
}

.sticky-note-card-pinned-label {
  color: #8a310a;
}

.sticky-note-pin-icon {
  transform: rotate(45deg);
}

.sticky-note-pin-button :deep(.v-icon) {
  transform: rotate(45deg);
}

.sticky-note-card-drag-handle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 1;
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  color: #5d6470;
  cursor: grab;
  background: transparent;
  border: 0;
  border-radius: 8px;
  place-items: center;
  touch-action: none;
}

.sticky-note-card-drag-handle:active {
  cursor: grabbing;
}

.sticky-note-card-drag-handle:focus-visible,
.sticky-note-card-edit:focus-visible {
  outline: 2px solid #1867c0;
  outline-offset: 2px;
}

.sticky-note-card-edit {
  color: inherit;
  text-align: start;
  cursor: text;
  background: transparent;
  border: 0;
  border-radius: 6px;
}

.sticky-note-card-edit h3 {
  margin-bottom: 8px;
  overflow-wrap: anywhere;
}

.sticky-note-card-content {
  margin: 0 0 12px;
  overflow-wrap: anywhere;
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.sticky-note-card-date {
  color: #5d6470;
  font-size: 12px;
}

.sticky-note-card-footer {
  flex-wrap: wrap;
  gap: 8px;
  justify-content: space-between;
  margin-top: auto;
}

.sticky-note-card-actions {
  gap: 0;
  margin-inline-start: auto;
}

.sticky-note-card :deep(.tag-chip) {
  color: #20242b;
  background: rgb(255 255 255 / 55%);
}
</style>
