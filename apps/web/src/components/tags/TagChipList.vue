<script setup lang="ts">
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Tag } from '@/api/tags'

withDefaults(
  defineProps<{
    tags: readonly Tag[]
    clickable?: boolean
  }>(),
  { clickable: false },
)

const emit = defineEmits<{
  select: [tag: Tag]
}>()

const { t } = useI18n()

function chipStyle(color: Tag['color']): CSSProperties {
  return { '--tag-color': color }
}
</script>

<template>
  <div class="tag-chip-list" :aria-label="t('tags.chip.listLabel')" role="group">
    <template v-for="tag in tags" :key="tag.id">
      <button
        v-if="clickable"
        class="tag-chip-list-button"
        type="button"
        @click="emit('select', tag)"
      >
        <v-chip class="tag-chip" :style="chipStyle(tag.color)" size="small">
          <span class="tag-chip-dot" aria-hidden="true" />
          <span>{{ tag.name }}</span>
        </v-chip>
      </button>
      <v-chip v-else class="tag-chip" :style="chipStyle(tag.color)" size="small">
        <span class="tag-chip-dot" aria-hidden="true" />
        <span>{{ tag.name }}</span>
      </v-chip>
    </template>
  </div>
</template>

<style scoped>
.tag-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip-list-button {
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 999px;
}

.tag-chip-list-button:focus-visible {
  outline: 2px solid rgb(var(--v-theme-secondary));
  outline-offset: 2px;
}

.tag-chip {
  color: rgb(var(--v-theme-on-surface));
  background: color-mix(in srgb, var(--tag-color) 14%, rgb(var(--v-theme-surface)));
  border: 1px solid color-mix(in srgb, var(--tag-color) 55%, rgb(var(--v-theme-outline)));
}

.tag-chip-dot {
  width: 8px;
  height: 8px;
  margin-inline-end: 6px;
  background: var(--tag-color);
  border-radius: 50%;
}
</style>
