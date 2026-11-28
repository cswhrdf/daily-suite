<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppEmptyState from '@/components/shared/AppEmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <app-empty-state
    :description="t('stickyNotes.description')"
    icon="mdi-note-text-outline"
    :title="t('nav.stickyNotes')"
  />
</template>
