<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Tag } from '@/api/tags'
import type { StickyNoteInput } from '@/api/stickyNotes'
import {
  DEFAULT_STICKY_NOTE_COLOR,
  STICKY_NOTE_COLOR_LABEL_KEYS,
  STICKY_NOTE_COLORS,
  type StickyNoteColor,
} from '@/constants/stickyNoteColors'
import { isMacPlatform } from '@/utils/platform'

const props = withDefaults(
  defineProps<{
    tags: readonly Tag[]
    saving?: boolean
  }>(),
  { saving: false },
)

const emit = defineEmits<{
  submit: [input: StickyNoteInput]
}>()

const { t } = useI18n()
const title = ref('')
const content = ref('')
const color = ref<StickyNoteColor>(DEFAULT_STICKY_NOTE_COLOR)
const tagIds = ref<number[]>([])
const attempted = ref(false)
const tagOptions = computed(() => props.tags.map((tag) => ({ title: tag.name, value: tag.id })))
const invalid = computed(() => title.value.trim() === '' && content.value.trim() === '')
const shortcut = computed(() =>
  t('stickyNotes.quickAdd.shortcut', { mod: isMacPlatform() ? '⌘' : 'Ctrl' }),
)

function colorStyle(noteColor: StickyNoteColor): CSSProperties {
  return { '--sticky-note-color': noteColor }
}

function colorLabel(noteColor: StickyNoteColor): string {
  return t(STICKY_NOTE_COLOR_LABEL_KEYS[noteColor])
}

function submit(): void {
  attempted.value = true
  if (invalid.value || props.saving) {
    return
  }
  emit('submit', {
    title: title.value.trim(),
    content: content.value.trim(),
    color: color.value,
    tag_ids: [...tagIds.value],
  })
}

function reset(): void {
  title.value = ''
  content.value = ''
  color.value = DEFAULT_STICKY_NOTE_COLOR
  tagIds.value = []
  attempted.value = false
}

defineExpose({ reset, submit })
</script>

<template>
  <form
    aria-labelledby="sticky-note-quick-add-title"
    class="sticky-note-quick-add"
    novalidate
    @submit.prevent="submit"
  >
    <h2 id="sticky-note-quick-add-title" class="text-h5">{{ t('stickyNotes.quickAdd.title') }}</h2>
    <p class="text-body-2 text-medium-emphasis">{{ t('stickyNotes.quickAdd.subtitle') }}</p>
    <div class="sticky-note-quick-add-surface">
      <v-text-field
        v-model="title"
        autocomplete="off"
        data-test="sticky-note-quick-title"
        density="comfortable"
        :disabled="saving"
        hide-details
        :label="t('stickyNotes.form.title')"
        :placeholder="t('stickyNotes.form.titlePlaceholder')"
        variant="plain"
        @keydown.ctrl.enter.prevent="submit"
        @keydown.enter.prevent
        @keydown.meta.enter.prevent="submit"
      />
      <v-divider />
      <v-textarea
        v-model="content"
        auto-grow
        data-test="sticky-note-quick-content"
        :disabled="saving"
        :error-messages="attempted && invalid ? [t('stickyNotes.form.contentRequired')] : []"
        hide-details="auto"
        :label="t('stickyNotes.form.content')"
        :placeholder="t('stickyNotes.quickAdd.contentPlaceholder')"
        rows="2"
        variant="plain"
        @keydown.ctrl.enter.prevent="submit"
        @keydown.meta.enter.prevent="submit"
      />
      <div class="sticky-note-quick-add-footer">
        <fieldset class="sticky-note-quick-add-colors" :disabled="saving">
          <legend class="sr-only">{{ t('stickyNotes.form.color') }}</legend>
          <v-btn
            v-for="noteColor in STICKY_NOTE_COLORS"
            :key="noteColor"
            :aria-label="t('stickyNotes.form.colorOption', { color: colorLabel(noteColor) })"
            :aria-pressed="color === noteColor"
            class="sticky-note-color-button"
            :class="{ 'sticky-note-color-button-selected': color === noteColor }"
            :data-test="`sticky-note-color-${noteColor}`"
            icon
            size="small"
            :style="colorStyle(noteColor)"
            variant="outlined"
            @click="color = noteColor"
          >
            <span aria-hidden="true" class="sticky-note-color-swatch" />
            <v-icon v-if="color === noteColor" aria-hidden="true" icon="mdi-check" size="14" />
          </v-btn>
        </fieldset>
        <v-autocomplete
          v-model="tagIds"
          chips
          class="sticky-note-quick-add-tags"
          clearable
          closable-chips
          data-test="sticky-note-quick-tags"
          density="comfortable"
          :disabled="saving"
          hide-details
          :items="tagOptions"
          :label="t('stickyNotes.form.tags')"
          multiple
          prepend-inner-icon="mdi-tag-plus-outline"
          variant="outlined"
        />
        <span class="text-caption text-medium-emphasis sticky-note-quick-add-shortcut">
          {{ shortcut }}
        </span>
        <v-btn
          color="primary"
          data-test="sticky-note-quick-submit"
          :disabled="saving"
          :loading="saving"
          type="submit"
        >
          {{ t('stickyNotes.quickAdd.save') }}
        </v-btn>
      </div>
    </div>
  </form>
</template>

<style scoped>
.sticky-note-quick-add {
  margin-bottom: 24px;
}

.sticky-note-quick-add > p {
  margin: 4px 0 16px;
}

.sticky-note-quick-add-surface {
  padding: 12px 24px 18px;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-top: 5px solid rgb(var(--v-theme-primary));
  border-radius: 15px;
}

.sticky-note-quick-add-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-top: 12px;
}

.sticky-note-quick-add-colors {
  display: flex;
  gap: 4px;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: 0;
}

.sticky-note-color-button {
  color: #20242b;
  background: var(--sticky-note-color);
}

.sticky-note-color-button-selected {
  border-color: rgb(var(--v-theme-primary));
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.sticky-note-color-swatch {
  width: 18px;
  height: 18px;
  background: var(--sticky-note-color);
  border-radius: 50%;
}

.sticky-note-quick-add-tags {
  flex: 1 1 180px;
  max-width: 320px;
}

.sticky-note-quick-add-shortcut {
  margin-inline-start: auto;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border: 0;
}
</style>
