<script setup lang="ts">
import { computed, ref, watch, type CSSProperties } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

import type { ApiError } from '@/api/errors'
import type { Tag, TagInput } from '@/api/tags'
import AppEmptyState from '@/components/shared/AppEmptyState.vue'
import AppErrorState from '@/components/shared/AppErrorState.vue'
import AppSkeleton from '@/components/shared/AppSkeleton.vue'
import TagChipList from '@/components/tags/TagChipList.vue'
import { useSnackbar } from '@/composables/useSnackbar'
import {
  DEFAULT_TAG_COLOR,
  TAG_COLOR_LABEL_KEYS,
  TAG_COLORS,
  type TagColor,
} from '@/constants/tagColors'
import { useTagsStore } from '@/stores/tags'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  created: [tag: Tag]
  updated: [tag: Tag]
  removed: [id: Tag['id']]
}>()

const { t } = useI18n()
const { smAndDown } = useDisplay()
const tagsStore = useTagsStore()
const snackbar = useSnackbar()
const name = ref('')
const color = ref<TagColor>(DEFAULT_TAG_COLOR)
const editingId = ref<Tag['id'] | null>(null)
const showValidation = ref(false)
const saving = ref(false)
const deleting = ref(false)
const deleteCandidate = ref<Tag | null>(null)

const visible = computed({
  get: () => props.modelValue,
  set: (value: boolean) => {
    if (!saving.value && !deleting.value) {
      emit('update:modelValue', value)
    }
  },
})
const formTitle = computed(() =>
  editingId.value === null ? t('tags.form.createTitle') : t('tags.form.editTitle'),
)
const nameErrors = computed(() =>
  showValidation.value && name.value.trim() === '' ? [t('tags.form.nameRequired')] : [],
)
const loadingInitialList = computed(
  () => tagsStore.listRequest.status === 'loading' && tagsStore.ordered.length === 0,
)
const initialListError = computed(
  () => tagsStore.listRequest.error !== null && tagsStore.ordered.length === 0,
)

function colorStyle(tagColor: TagColor): CSSProperties {
  return { '--tag-color': tagColor }
}

function colorLabel(tagColor: TagColor): string {
  return t(TAG_COLOR_LABEL_KEYS[tagColor])
}

function resetForm(): void {
  editingId.value = null
  name.value = ''
  color.value = DEFAULT_TAG_COLOR
  showValidation.value = false
}

function startEdit(tag: Tag): void {
  editingId.value = tag.id
  name.value = tag.name
  color.value = tag.color
  showValidation.value = false
}

function close(): void {
  visible.value = false
}

async function loadTags(): Promise<void> {
  try {
    await tagsStore.fetchAll()
  } catch {
    // 请求状态已保存到 Store，由对话框内错误组件提供重试。
  }
}

function showFailure(error: unknown): void {
  const apiError = error as ApiError
  snackbar.rollback(t('tags.feedback.rollback', { message: apiError.message }))
}

async function submit(): Promise<void> {
  showValidation.value = true
  const trimmedName = name.value.trim()
  if (trimmedName === '' || saving.value) {
    return
  }

  saving.value = true
  const input: TagInput = { name: trimmedName, color: color.value }
  const currentEditingId = editingId.value
  try {
    if (currentEditingId === null) {
      const tag = await tagsStore.create(input)
      if (tag !== undefined) {
        emit('created', tag)
        snackbar.success(t('tags.feedback.created'))
        resetForm()
      }
    } else {
      const tag = await tagsStore.update(currentEditingId, input)
      if (tag !== undefined) {
        emit('updated', tag)
        snackbar.success(t('tags.feedback.updated'))
        resetForm()
      }
    }
  } catch (error: unknown) {
    // 不重置表单，确保网络或服务端失败后用户输入仍在。
    showFailure(error)
  } finally {
    saving.value = false
  }
}

function requestDelete(tag: Tag): void {
  deleteCandidate.value = tag
}

function cancelDelete(): void {
  if (!deleting.value) {
    deleteCandidate.value = null
  }
}

async function confirmDelete(): Promise<void> {
  const candidate = deleteCandidate.value
  if (candidate === null || deleting.value) {
    return
  }

  deleting.value = true
  try {
    const removed = await tagsStore.remove(candidate.id)
    if (removed) {
      emit('removed', candidate.id)
      snackbar.success(t('tags.feedback.removed'))
      deleteCandidate.value = null
      if (editingId.value === candidate.id) {
        resetForm()
      }
    }
  } catch (error: unknown) {
    showFailure(error)
  } finally {
    deleting.value = false
  }
}

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      resetForm()
      deleteCandidate.value = null
      if (tagsStore.listRequest.status === 'idle') {
        void loadTags()
      }
    }
  },
  { immediate: true },
)
</script>

<template>
  <v-dialog
    v-model="visible"
    class="tag-manage-dialog"
    :fullscreen="smAndDown"
    max-width="640"
    :persistent="saving || deleting"
    scrollable
  >
    <v-card :rounded="smAndDown ? '0' : 'lg'">
      <v-card-title class="tag-manage-dialog-header">
        <span>{{ t('tags.manage.title') }}</span>
        <v-btn
          :aria-label="t('tags.manage.close')"
          :disabled="saving || deleting"
          icon="mdi-close"
          variant="text"
          @click="close"
        />
      </v-card-title>
      <v-divider />
      <v-card-text class="tag-manage-dialog-body">
        <app-skeleton v-if="loadingInitialList" height="180" type="list-item-three-line" />
        <app-error-state
          v-else-if="initialListError"
          :message="tagsStore.listRequest.error?.message ?? t('apiErrors.unknown')"
          @retry="loadTags"
        />
        <template v-else>
          <section aria-labelledby="existing-tags-title" class="tag-manage-dialog-section">
            <h3 id="existing-tags-title" class="text-subtitle-1 mb-3">
              {{ t('tags.manage.existing') }}
            </h3>
            <app-empty-state
              v-if="tagsStore.ordered.length === 0"
              class="tag-manage-dialog-empty"
              :description="t('tags.manage.empty')"
              icon="mdi-tag-plus-outline"
              :title="t('tags.manage.emptyTitle')"
            />
            <v-list v-else border class="tag-manage-dialog-list" rounded="lg">
              <v-list-item v-for="tag in tagsStore.ordered" :key="tag.id">
                <template #prepend>
                  <tag-chip-list :tags="[tag]" />
                </template>
                <template #append>
                  <v-btn
                    :aria-label="t('tags.manage.edit', { name: tag.name })"
                    :data-test="`tag-edit-${tag.id}`"
                    :disabled="saving || deleting"
                    icon="mdi-pencil-outline"
                    size="small"
                    variant="text"
                    @click="startEdit(tag)"
                  />
                  <v-btn
                    :aria-label="t('tags.manage.delete', { name: tag.name })"
                    color="error"
                    :data-test="`tag-delete-${tag.id}`"
                    :disabled="saving || deleting"
                    icon="mdi-delete-outline"
                    size="small"
                    variant="text"
                    @click="requestDelete(tag)"
                  />
                </template>
              </v-list-item>
            </v-list>
          </section>

          <v-divider class="my-5" />

          <form class="tag-manage-dialog-section" novalidate @submit.prevent="submit">
            <h3 class="text-subtitle-1 mb-3">{{ formTitle }}</h3>
            <v-text-field
              v-model="name"
              autocomplete="off"
              data-test="tag-name-input"
              :disabled="saving"
              :error-messages="nameErrors"
              :label="t('tags.form.name')"
              :placeholder="t('tags.form.namePlaceholder')"
              variant="outlined"
              @update:model-value="showValidation = false"
            />
            <fieldset class="tag-manage-dialog-colors" :disabled="saving">
              <legend class="text-body-2 mb-2">{{ t('tags.form.color') }}</legend>
              <div class="tag-manage-dialog-color-grid">
                <v-btn
                  v-for="tagColor in TAG_COLORS"
                  :key="tagColor"
                  :aria-label="t('tags.form.colorOption', { color: colorLabel(tagColor) })"
                  :aria-pressed="color === tagColor"
                  class="tag-manage-dialog-color"
                  :class="{ 'tag-manage-dialog-color-selected': color === tagColor }"
                  :data-test="`tag-color-${tagColor}`"
                  :style="colorStyle(tagColor)"
                  variant="outlined"
                  @click="color = tagColor"
                >
                  <span aria-hidden="true" class="tag-manage-dialog-swatch" />
                  <span class="tag-manage-dialog-color-label">{{ colorLabel(tagColor) }}</span>
                  <v-icon v-if="color === tagColor" aria-hidden="true" icon="mdi-check" size="16" />
                </v-btn>
              </div>
              <p class="text-body-2 text-medium-emphasis mt-2 mb-0">
                {{ t('tags.form.selectedColor', { color: colorLabel(color) }) }}
              </p>
            </fieldset>
            <div class="tag-manage-dialog-form-actions">
              <v-btn v-if="editingId !== null" :disabled="saving" variant="text" @click="resetForm">
                {{ t('tags.form.cancelEdit') }}
              </v-btn>
              <v-btn
                color="primary"
                data-test="tag-submit"
                :disabled="saving"
                :loading="saving"
                type="submit"
              >
                {{ editingId === null ? t('tags.form.create') : t('tags.form.save') }}
              </v-btn>
            </div>
          </form>
        </template>
      </v-card-text>
    </v-card>
  </v-dialog>

  <v-dialog
    max-width="440"
    :model-value="deleteCandidate !== null"
    :persistent="deleting"
    @update:model-value="cancelDelete"
  >
    <v-card rounded="lg">
      <v-card-title>{{ t('tags.delete.title') }}</v-card-title>
      <v-card-text>
        <p class="mb-2">
          {{ t('tags.delete.message', { name: deleteCandidate?.name ?? '' }) }}
        </p>
        <strong>{{ t('tags.delete.associations') }}</strong>
      </v-card-text>
      <v-card-actions>
        <v-spacer />
        <v-btn :disabled="deleting" variant="text" @click="cancelDelete">
          {{ t('tags.delete.cancel') }}
        </v-btn>
        <v-btn
          color="error"
          data-test="tag-delete-confirm"
          :disabled="deleting"
          :loading="deleting"
          @click="confirmDelete"
        >
          {{ t('tags.delete.confirm') }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<style scoped>
.tag-manage-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 12px 16px 24px;
}

.tag-manage-dialog-body {
  padding: 24px;
}

.tag-manage-dialog-section {
  min-width: 0;
}

.tag-manage-dialog-empty {
  padding: 20px;
  background: rgb(var(--v-theme-surface-variant));
}

.tag-manage-dialog-list {
  padding-block: 4px;
}

.tag-manage-dialog-colors {
  min-width: 0;
  padding: 0;
  border: 0;
}

.tag-manage-dialog-color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(128px, 1fr));
  gap: 8px;
}

.tag-manage-dialog-color {
  min-height: 40px;
  padding-inline: 10px;
  border-radius: 10px;
}

.tag-manage-dialog-color-selected {
  background: color-mix(in srgb, var(--tag-color) 12%, rgb(var(--v-theme-surface)));
  border-color: var(--tag-color);
}

.tag-manage-dialog-swatch {
  width: 14px;
  height: 14px;
  margin-inline-end: 8px;
  background: var(--tag-color);
  border-radius: 50%;
}

.tag-manage-dialog-color-label {
  font-size: 12px;
}

.tag-manage-dialog-form-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
