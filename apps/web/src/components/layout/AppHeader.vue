<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

const route = useRoute()
const { t } = useI18n()

const title = computed(() => {
  const titleKey = route.meta.title
  return typeof titleKey === 'string' ? t(titleKey) : t('app.title')
})
</script>

<template>
  <v-app-bar color="primary" density="compact" flat>
    <v-app-bar-title>{{ title }}</v-app-bar-title>
  </v-app-bar>
</template>
