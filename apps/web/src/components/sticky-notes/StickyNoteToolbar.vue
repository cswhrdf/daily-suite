<script setup lang="ts">
import { computed } from 'vue'
import { useDisplay } from 'vuetify'
import { useI18n } from 'vue-i18n'

import type { Tag } from '@/api/tags'
import TagFilterMenu from '@/components/tags/TagFilterMenu.vue'

const props = withDefaults(
  defineProps<{
    archived: boolean
    archivedCount?: number
    count: number
    pinnedFirst: boolean
    search: string
    selectedTag: number | null
    tags: readonly Tag[]
    tagsLoading?: boolean
  }>(),
  { archivedCount: 0, tagsLoading: false },
)

const emit = defineEmits<{
  clear: []
  'update:archived': [value: boolean]
  'update:pinnedFirst': [value: boolean]
  'update:search': [value: string]
  'update:selectedTag': [value: number | null]
}>()

const { t } = useI18n()
const { smAndDown } = useDisplay()
const hasFilters = computed(
  () => props.search !== '' || props.selectedTag !== null || !props.pinnedFirst || props.archived,
)
</script>

<template>
  <section
    :aria-label="t('stickyNotes.toolbar.label')"
    class="sticky-note-toolbar"
    :class="{ 'sticky-note-toolbar-mobile': smAndDown }"
  >
    <div class="sticky-note-toolbar-controls">
      <v-text-field
        class="sticky-note-toolbar-search"
        clearable
        data-test="sticky-note-search"
        density="comfortable"
        hide-details
        :label="t('stickyNotes.toolbar.search')"
        :model-value="search"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        @update:model-value="emit('update:search', String($event ?? ''))"
      />
      <tag-filter-menu
        :disabled="tagsLoading"
        :loading="tagsLoading"
        :model-value="selectedTag"
        :tags="tags"
        @update:model-value="emit('update:selectedTag', $event)"
      />
      <v-btn
        :aria-pressed="pinnedFirst"
        class="sticky-note-pin-button"
        :color="pinnedFirst ? 'primary' : undefined"
        data-test="sticky-note-pinned-first"
        :prepend-icon="pinnedFirst ? 'mdi-pin' : 'mdi-pin-outline'"
        :variant="pinnedFirst ? 'tonal' : 'outlined'"
        @click="emit('update:pinnedFirst', !pinnedFirst)"
      >
        {{ t('stickyNotes.toolbar.pinnedFirst') }}
      </v-btn>
      <v-btn
        :aria-pressed="archived"
        :color="archived ? 'secondary' : undefined"
        data-test="sticky-note-archive-toggle"
        :prepend-icon="archived ? 'mdi-archive' : 'mdi-archive-outline'"
        :variant="archived ? 'tonal' : 'outlined'"
        @click="emit('update:archived', !archived)"
      >
        {{ t('stickyNotes.toolbar.archived', { count: archivedCount }) }}
      </v-btn>
      <v-btn
        v-if="hasFilters"
        data-test="sticky-note-clear-filters"
        prepend-icon="mdi-filter-off-outline"
        variant="text"
        @click="emit('clear')"
      >
        {{ t('stickyNotes.toolbar.clear') }}
      </v-btn>
    </div>
    <p class="text-body-2 text-medium-emphasis sticky-note-toolbar-summary">
      {{ t('stickyNotes.toolbar.summary', { count }) }}
    </p>
  </section>
</template>

<style scoped>
.sticky-note-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.sticky-note-toolbar-controls {
  display: flex;
  flex: 1 1 760px;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
}

.sticky-note-toolbar-search {
  flex: 0 1 300px;
  min-width: 220px;
}

.sticky-note-pin-button :deep(.v-icon) {
  transform: rotate(45deg);
}

.sticky-note-toolbar-summary {
  margin: 0;
  white-space: nowrap;
}

.sticky-note-toolbar-mobile .sticky-note-toolbar-search {
  flex-basis: 100%;
  min-width: 0;
}

.sticky-note-toolbar-mobile .sticky-note-toolbar-summary {
  white-space: normal;
}
</style>
