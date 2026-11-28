<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useDisplay } from 'vuetify'

import type { NavItem } from '@/router/nav'

defineProps<{
  items: NavItem[]
}>()

const { mdAndUp } = useDisplay()
const { t } = useI18n()
</script>

<template>
  <v-navigation-drawer
    v-if="mdAndUp"
    :aria-label="t('nav.label')"
    permanent
    width="280"
  >
    <v-list nav>
      <v-list-item
        v-for="item in items"
        :key="item.to"
        color="primary"
        :title="t(item.title)"
        :to="item.to"
      />
    </v-list>
  </v-navigation-drawer>
</template>
