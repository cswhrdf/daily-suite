<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

import type { ConvertStickyNoteInput, StickyNote } from '@/api/stickyNotes'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    note: StickyNote
    saving?: boolean
  }>(),
  { saving: false },
)

const emit = defineEmits<{
  confirm: [id: number, input: ConvertStickyNoteInput]
  'update:modelValue': [value: boolean]
}>()

const { t } = useI18n()
const { smAndDown } = useDisplay()
const dueAt = ref('')
const priority = ref<NonNullable<ConvertStickyNoteInput['priority']>>('medium')
const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => {
    if (!props.saving) {
      emit('update:modelValue', value)
    }
  },
})
const priorityOptions = computed(() => [
  { title: t('stickyNotes.convert.priorityLow'), value: 'low' },
  { title: t('stickyNotes.convert.priorityMedium'), value: 'medium' },
  { title: t('stickyNotes.convert.priorityHigh'), value: 'high' },
])

function close(): void {
  visible.value = false
}

function confirm(): void {
  if (props.saving) {
    return
  }
  const input: ConvertStickyNoteInput = {
    priority: priority.value,
    ...(dueAt.value === '' ? {} : { due_at: new Date(dueAt.value).toISOString() }),
  }
  emit('confirm', props.note.id, input)
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      dueAt.value = ''
      priority.value = 'medium'
    }
  },
  { immediate: true },
)

defineExpose({ close, confirm })
</script>

<template>
  <v-dialog v-model="visible" :fullscreen="smAndDown" max-width="560" :persistent="saving">
    <v-card :rounded="smAndDown ? '0' : 'lg'">
      <v-card-title class="convert-sticky-note-dialog-header">
        <span>{{ t('stickyNotes.convert.title') }}</span>
        <v-btn
          :aria-label="t('stickyNotes.convert.close')"
          :disabled="saving"
          icon="mdi-close"
          variant="text"
          @click="close"
        />
      </v-card-title>
      <v-divider />
      <v-card-text>
        <div class="convert-sticky-note-dialog-source">
          <v-icon aria-hidden="true" color="primary" icon="mdi-note-text-outline" />
          <div>
            <strong>{{ note.title || t('stickyNotes.card.untitled') }}</strong>
            <p>{{ note.content || t('stickyNotes.convert.emptySource') }}</p>
          </div>
        </div>
        <p class="text-body-2 text-medium-emphasis">
          {{ t('stickyNotes.convert.description') }}
        </p>
        <v-text-field
          v-model="dueAt"
          data-test="sticky-note-convert-due-at"
          :disabled="saving"
          :label="t('stickyNotes.convert.dueAt')"
          type="datetime-local"
          variant="outlined"
        />
        <v-select
          v-model="priority"
          data-test="sticky-note-convert-priority"
          :disabled="saving"
          :items="priorityOptions"
          :label="t('stickyNotes.convert.priority')"
          variant="outlined"
        />
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="saving" variant="text" @click="close">
          {{ t('stickyNotes.convert.cancel') }}
        </v-btn>
        <v-btn
          color="primary"
          data-test="sticky-note-convert-confirm"
          :disabled="saving"
          :loading="saving"
          @click="confirm"
        >
          {{ t('stickyNotes.convert.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.convert-sticky-note-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px 16px 24px;
}

.convert-sticky-note-dialog-source {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 16px;
  margin-bottom: 16px;
  background: rgb(var(--v-theme-surface-variant));
  border-radius: 12px;
}

.convert-sticky-note-dialog-source p {
  display: -webkit-box;
  margin: 4px 0 0;
  overflow: hidden;
  color: rgb(var(--v-theme-on-surface-variant));
  font-size: 14px;
  white-space: pre-wrap;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}
</style>
