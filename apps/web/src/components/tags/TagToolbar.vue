<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Tag } from '@/api/tags'
import TagFilterMenu from '@/components/tags/TagFilterMenu.vue'
import TagManageDialog from '@/components/tags/TagManageDialog.vue'
import { useTagsStore } from '@/stores/tags'

const props = defineProps<{
  modelValue: Tag['id'] | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: Tag['id'] | null]
}>()

const { t } = useI18n()
const tagsStore = useTagsStore()
const manageOpen = ref(false)

async function loadTags(): Promise<void> {
  try {
    await tagsStore.fetchAll()
  } catch {
    // 工具条保留重试入口，具体错误由统一请求状态提供。
  }
}

function onRemoved(id: Tag['id']): void {
  if (props.modelValue === id) {
    emit('update:modelValue', null)
  }
}

onMounted(() => {
  if (tagsStore.listRequest.status === 'idle') {
    void loadTags()
  }
})
</script>

<template>
  <div class="tag-toolbar-region">
    <section :aria-label="t('tags.toolbar.label')" class="tag-toolbar">
      <tag-filter-menu
        :disabled="tagsStore.listRequest.status === 'loading'"
        :loading="tagsStore.listRequest.status === 'loading'"
        :model-value="modelValue"
        :tags="tagsStore.ordered"
        @update:model-value="emit('update:modelValue', $event)"
      />
      <v-btn
        class="tag-toolbar-manage"
        color="primary"
        prepend-icon="mdi-tag-edit-outline"
        variant="text"
        @click="manageOpen = true"
      >
        {{ t('tags.manage.action') }}
      </v-btn>
    </section>
    <v-alert
      v-if="tagsStore.listRequest.error !== null"
      class="mt-3"
      color="error"
      density="compact"
      :text="tagsStore.listRequest.error.message"
      variant="tonal"
    >
      <template #append>
        <v-btn size="small" variant="text" @click="loadTags">{{ t('state.retry') }}</v-btn>
      </template>
    </v-alert>
    <tag-manage-dialog v-model="manageOpen" @removed="onRemoved" />
  </div>
</template>

<style scoped>
.tag-toolbar-region {
  margin-bottom: 24px;
}

.tag-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding: 12px;
  background: rgb(var(--v-theme-surface));
  border: 1px solid rgb(var(--v-theme-outline));
  border-radius: 13px;
}

.tag-toolbar-manage {
  margin-inline-start: auto;
}
</style>
