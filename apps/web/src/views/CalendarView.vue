<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import AppEmptyState from '@/components/shared/AppEmptyState.vue'

const { t } = useI18n()
</script>

<template>
  <app-empty-state
    :description="t('calendar.description')"
    icon="mdi-calendar-month-outline"
    :title="t('nav.calendar')"
  />
</template>
