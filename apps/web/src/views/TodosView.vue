<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppEmptyState from '@/components/shared/AppEmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <app-empty-state
    :description="t('todos.description')"
    icon="mdi-checkbox-marked-circle-outline"
    :title="t('nav.todos')"
  />
</template>
