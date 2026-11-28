<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

import type { Tag } from '@/api/tags'
import type { StickyNote, StickyNoteInput } from '@/api/stickyNotes'
import { STICKY_NOTE_COLORS, type StickyNoteColor } from '@/constants/stickyNoteColors'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    note: StickyNote
    tags: readonly Tag[]
    saving?: boolean
  }>(),
  { saving: false },
)

const emit = defineEmits<{
  save: [id: number, input: StickyNoteInput]
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const { smAndDown } = useDisplay()
const title = ref('')
const content = ref('')
const color = ref<StickyNoteColor>(props.note.color)
const tagIds = ref<number[]>([])
const attempted = ref(false)
const confirmOpen = ref(false)
const tagOptions = computed(() => props.tags.map((tag) => ({ title: tag.name, value: tag.id })))
const invalid = computed(() => title.value.trim() === '' && content.value.trim() === '')
const isDirty = computed(
  () =>
    title.value !== props.note.title ||
    content.value !== props.note.content ||
    color.value !== props.note.color ||
    tagIds.value.join(',') !== props.note.tags.map((tag) => tag.id).join(','),
)
const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => {
    if (!value && isDirty.value && !props.saving) {
      confirmOpen.value = true
      return
    }
    if (!props.saving) {
      emit('update:modelValue', value)
    }
  },
})

function colorStyle(noteColor: StickyNoteColor): CSSProperties {
  return { '--sticky-note-color': noteColor }
}

function reset(): void {
  title.value = props.note.title
  content.value = props.note.content
  color.value = props.note.color
  tagIds.value = props.note.tags.map((tag) => tag.id)
  attempted.value = false
  confirmOpen.value = false
}

function requestClose(): void {
  visible.value = false
}

function cancelDiscard(): void {
  confirmOpen.value = false
}

function confirmDiscard(): void {
  confirmOpen.value = false
  emit('update:modelValue', false)
}

function submit(): void {
  attempted.value = true
  if (invalid.value || props.saving) {
    return
  }
  emit('save', props.note.id, {
    title: title.value.trim(),
    content: content.value.trim(),
    color: color.value,
    tag_ids: [...tagIds.value],
  })
}

watch(
  () => [props.modelValue, props.note.id] as const,
  ([isOpen]) => {
    if (isOpen) {
      reset()
    }
  },
  { immediate: true },
)

defineExpose({ cancelDiscard, confirmDiscard, isDirty, requestClose, reset, submit })
</script>

<template>
  <v-dialog
    v-model="visible"
    :fullscreen="smAndDown"
    max-width="680"
    :persistent="saving"
    scrollable
  >
    <v-card :rounded="smAndDown ? '0' : 'xl'">
      <v-card-title class="sticky-note-edit-dialog-header">
        <span>{{ t('stickyNotes.edit.title') }}</span>
        <v-btn
          :aria-label="t('stickyNotes.edit.close')"
          :disabled="saving"
          icon="mdi-close"
          variant="text"
          @click="requestClose"
        />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <form id="sticky-note-edit-form" novalidate @submit.prevent="submit">
          <v-text-field
            v-model="title"
            autocomplete="off"
            data-test="sticky-note-edit-title"
            :disabled="saving"
            :label="t('stickyNotes.form.title')"
            variant="outlined"
          />
          <v-textarea
            v-model="content"
            auto-grow
            data-test="sticky-note-edit-content"
            :disabled="saving"
            :error-messages="attempted && invalid ? [t('stickyNotes.form.contentRequired')] : []"
            :label="t('stickyNotes.form.content')"
            rows="5"
            variant="outlined"
          />
          <fieldset class="sticky-note-edit-dialog-colors" :disabled="saving">
            <legend class="text-body-2 mb-2">{{ t('stickyNotes.form.color') }}</legend>
            <div class="sticky-note-edit-dialog-color-grid">
              <v-btn
                v-for="noteColor in STICKY_NOTE_COLORS"
                :key="noteColor"
                :aria-label="t('stickyNotes.form.colorOption', { color: noteColor })"
                :aria-pressed="color === noteColor"
                class="sticky-note-edit-dialog-color"
                :class="{ 'sticky-note-edit-dialog-color-selected': color === noteColor }"
                :style="colorStyle(noteColor)"
                variant="outlined"
                @click="color = noteColor"
              >
                <span aria-hidden="true" class="sticky-note-edit-dialog-swatch" />
                <span>{{ noteColor }}</span>
                <v-icon v-if="color === noteColor" aria-hidden="true" icon="mdi-check" size="16" />
              </v-btn>
            </div>
          </fieldset>
          <v-autocomplete
            v-model="tagIds"
            chips
            clearable
            closable-chips
            data-test="sticky-note-edit-tags"
            :disabled="saving"
            :items="tagOptions"
            :label="t('stickyNotes.form.tags')"
            multiple
            variant="outlined"
          />
        </form>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" variant="text" @click="requestClose">
          {{ t('stickyNotes.edit.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          data-test="sticky-note-edit-save"
          :disabled="saving"
          form="sticky-note-edit-form"
          :loading="saving"
          type="submit"
        >
          {{ t('stickyNotes.edit.save') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="confirmOpen" max-width="440">
    <v-card rounded="xl">
      <v-card-title>{{ t('stickyNotes.edit.discardTitle') }}</v-card-title>
      <v-card-text>{{ t('stickyNotes.edit.discardMessage') }}</v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn data-test="sticky-note-discard-cancel" variant="text" @click="cancelDiscard">
          {{ t('stickyNotes.edit.keepEditing') }}
        </v-btn>
        <v-btn color="error" data-test="sticky-note-discard-confirm" @click="confirmDiscard">
          {{ t('stickyNotes.edit.discard') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.sticky-note-edit-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px 16px 24px;
}

.sticky-note-edit-dialog-colors {
  padding: 0;
  margin: 0 0 20px;
  border: 0;
}

.sticky-note-edit-dialog-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(132px, 1fr));
  gap: 8px;
}

.sticky-note-edit-dialog-color {
  color: #20242b;
  font-family: monospace;
  font-size: 12px;
  background: var(--sticky-note-color);
}

.sticky-note-edit-dialog-color-selected {
  border-color: rgb(var(--v-theme-primary));
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: 1px;
}

.sticky-note-edit-dialog-swatch {
  width: 14px;
  height: 14px;
  margin-inline-end: 8px;
  background: var(--sticky-note-color);
  border-radius: 50%;
}
</style>
