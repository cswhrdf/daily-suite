<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import AppEmptyState from '@/components/shared/AppEmptyState.vue'
import TagToolbar from '@/components/tags/TagToolbar.vue'

const { t } = useI18n()
const selectedTag = ref<number | null>(null)
</script>

<template>
  <section>
    <tag-toolbar v-model="selectedTag" />
    <app-empty-state
      :description="t('todos.description')"
      icon="mdi-checkbox-marked-circle-outline"
      :title="t('nav.todos')"
    />
  </section>
</template>
