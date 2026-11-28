<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  title?: string
  message: string
  retryLabel?: string
}>()

const emit = defineEmits<{
  retry: []
}>()

const { t } = useI18n()
const title = computed(() => props.title ?? t('state.errorTitle'))
const retryLabel = computed(() => props.retryLabel ?? t('state.retry'))
</script>

<template>
  <v-sheet class="app-error-state" role="alert" rounded="lg">
    <v-icon aria-hidden="true" color="error" icon="mdi-alert-circle-outline" size="48" />
    <h2 class="text-h6 mt-4">{{ title }}</h2>
    <p class="text-body-2 text-medium-emphasis mt-2">{{ message }}</p>
    <v-btn color="primary" prepend-icon="mdi-refresh" @click="emit('retry')">
      {{ retryLabel }}
    </v-btn>
  </v-sheet>
</template>

<style scoped>
.app-error-state {
  padding: 32px;
  text-align: center;
}
</style>
