<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useSnackbarState } from '@/composables/useSnackbar'

const { state, dismiss, runAction } = useSnackbarState()
const { t } = useI18n()

const visible = computed({
  get: () => state.visible,
  set: (value: boolean) => {
    state.visible = value
  },
})
</script>

<template>
  <v-snackbar v-model="visible" :color="state.tone" :timeout="state.timeout">
    {{ state.message }}

    <template #actions>
      <v-btn v-if="state.onAction !== null" variant="text" @click="runAction">
        {{ state.actionLabel }}
      </v-btn>
      <v-btn
        :aria-label="t('snackbar.dismiss')"
        icon="mdi-close"
        variant="text"
        @click="dismiss"
      />
    </template>
  </v-snackbar>
</template>
