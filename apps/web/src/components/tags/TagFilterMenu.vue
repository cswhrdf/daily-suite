<script setup lang="ts">
import { computed, ref, type CSSProperties } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

import type { Tag } from '@/api/tags'

const props = withDefaults(
  defineProps<{
    tags: readonly Tag[]
    modelValue: Tag['id'] | null
    disabled?: boolean
    loading?: boolean
  }>(),
  { disabled: false, loading: false },
)

const emit = defineEmits<{
  'update:modelValue': [value: Tag['id'] | null]
  change: [value: Tag['id'] | null]
}>()

const { t } = useI18n()
const { smAndDown, mdAndUp } = useDisplay()
const desktopOpen = ref(false)
const mobileOpen = ref(false)
const selectedTag = computed(() => props.tags.find((tag) => tag.id === props.modelValue))
const activatorText = computed(() => selectedTag.value?.name ?? t('tags.filter.all'))

function colorStyle(color: Tag['color']): CSSProperties {
  return { '--tag-color': color }
}

function selectTag(id: Tag['id']): void {
  // 一期只提交单个 tag；扩展多选时可在此改为 ID 数组，并保持清除事件的空值语义。
  emit('update:modelValue', id)
  emit('change', id)
  desktopOpen.value = false
  mobileOpen.value = false
}

function clearFilter(): void {
  emit('update:modelValue', null)
  emit('change', null)
  desktopOpen.value = false
  mobileOpen.value = false
}
</script>

<template>
  <v-menu
    v-if="mdAndUp"
    v-model="desktopOpen"
    :close-on-content-click="false"
    location="bottom start"
    min-width="280"
  >
    <template #activator="{ props: activatorProps }">
      <v-btn
        v-bind="activatorProps"
        class="tag-filter-menu-activator"
        :disabled="disabled"
        append-icon="mdi-menu-down"
        height="40"
        :loading="loading"
        prepend-icon="mdi-tag-multiple-outline"
        variant="outlined"
      >
        <span v-if="selectedTag" class="tag-filter-menu-selected-color" :style="colorStyle(selectedTag.color)" aria-hidden="true" />
        <span class="tag-filter-menu-activator-text">{{ activatorText }}</span>
      </v-btn>
    </template>

    <v-card class="tag-filter-menu-content" rounded="lg">
      <div class="tag-filter-menu-heading">
        <span class="text-subtitle-2">{{ t('tags.filter.label') }}</span>
        <v-btn
          v-if="modelValue !== null"
          data-test="tag-filter-clear"
          size="small"
          variant="text"
          @click="clearFilter"
        >
          {{ t('tags.filter.clear') }}
        </v-btn>
      </div>
      <v-list density="comfortable" nav>
        <v-list-item
          data-test="tag-filter-all"
          :active="modelValue === null"
          link
          prepend-icon="mdi-tag-off-outline"
          :title="t('tags.filter.all')"
          @click="clearFilter"
        />
        <v-list-item
          v-for="tag in tags"
          :key="tag.id"
          :active="modelValue === tag.id"
          :data-test="`tag-filter-option-${tag.id}`"
          link
          :title="tag.name"
          @click="selectTag(tag.id)"
        >
          <template #prepend>
            <span class="tag-filter-menu-color" :style="colorStyle(tag.color)" aria-hidden="true" />
          </template>
        </v-list-item>
      </v-list>
      <p v-if="tags.length === 0" class="text-body-2 text-medium-emphasis pa-4 mb-0">
        {{ t('tags.filter.empty') }}
      </p>
    </v-card>
  </v-menu>

  <template v-else-if="smAndDown">
    <v-btn
      class="tag-filter-menu-activator"
      :disabled="disabled"
      append-icon="mdi-menu-down"
      height="40"
      :loading="loading"
      prepend-icon="mdi-tag-multiple-outline"
      variant="outlined"
      @click="mobileOpen = true"
    >
      <span v-if="selectedTag" class="tag-filter-menu-selected-color" :style="colorStyle(selectedTag.color)" aria-hidden="true" />
      <span class="tag-filter-menu-activator-text">{{ activatorText }}</span>
    </v-btn>
    <v-bottom-sheet v-model="mobileOpen">
      <v-sheet class="tag-filter-menu-sheet" rounded="t-xl">
        <div class="tag-filter-menu-heading">
          <h2 class="text-h6">{{ t('tags.filter.label') }}</h2>
          <v-btn
            v-if="modelValue !== null"
            data-test="tag-filter-clear"
            size="small"
            variant="text"
            @click="clearFilter"
          >
            {{ t('tags.filter.clear') }}
          </v-btn>
        </div>
        <v-list density="comfortable" nav>
          <v-list-item
            data-test="tag-filter-all"
            :active="modelValue === null"
            link
            prepend-icon="mdi-tag-off-outline"
            :title="t('tags.filter.all')"
            @click="clearFilter"
          />
          <v-list-item
            v-for="tag in tags"
            :key="tag.id"
            :active="modelValue === tag.id"
            :data-test="`tag-filter-option-${tag.id}`"
            link
            :title="tag.name"
            @click="selectTag(tag.id)"
          >
            <template #prepend>
              <span class="tag-filter-menu-color" :style="colorStyle(tag.color)" aria-hidden="true" />
            </template>
          </v-list-item>
        </v-list>
        <p v-if="tags.length === 0" class="text-body-2 text-medium-emphasis pa-4 mb-0">
          {{ t('tags.filter.empty') }}
        </p>
      </v-sheet>
    </v-bottom-sheet>
  </template>
</template>

<style scoped>
.tag-filter-menu-activator {
  max-width: 100%;
  background: rgb(var(--v-theme-surface));
  border-radius: 10px;
}

.tag-filter-menu-activator-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag-filter-menu-selected-color,
.tag-filter-menu-color {
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  background: var(--tag-color);
  border-radius: 50%;
}

.tag-filter-menu-selected-color {
  margin-inline-end: 8px;
}

.tag-filter-menu-color {
  margin-inline: 8px 16px;
}

.tag-filter-menu-content {
  padding-block: 8px;
  border: 1px solid rgb(var(--v-theme-outline));
}

.tag-filter-menu-heading {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 40px;
  padding-inline: 16px 8px;
}

.tag-filter-menu-sheet {
  padding-block: 12px max(16px, env(safe-area-inset-bottom));
}
</style>
