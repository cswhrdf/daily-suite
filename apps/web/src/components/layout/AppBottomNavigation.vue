<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import { useDisplay } from 'vuetify'

import type { NavItem } from '@/router/nav'

const props = defineProps<{
  items: NavItem[]
}>()

const route = useRoute()
const { smAndDown } = useDisplay()
const { t } = useI18n()

const selectedPath = computed(() => {
  return props.items.some((item) => item.to === route.path) ? route.path : ''
})
</script>

<template>
  <v-bottom-navigation
    v-if="smAndDown"
    :aria-label="t('nav.label')"
    color="primary"
    grow
    :model-value="selectedPath"
  >
    <v-btn
      v-for="item in items"
      :key="item.to"
      :aria-label="t(item.title)"
      :to="item.to"
      :value="item.to"
      variant="text"
    >
      <span class="text-caption">{{ t(item.title) }}</span>
    </v-btn>
  </v-bottom-navigation>
</template>
