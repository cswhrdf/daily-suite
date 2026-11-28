<script setup lang="ts">
import AppBottomNavigation from '@/components/layout/AppBottomNavigation.vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppNavigationDrawer from '@/components/layout/AppNavigationDrawer.vue'
import GlobalSnackbar from '@/components/shared/GlobalSnackbar.vue'
import router from '@/router'
import { collectNavItems } from '@/router/nav'

// 抽屉与底部导航共享同一份由路由配置派生的清单。
const navItems = collectNavItems(router.options.routes)
</script>

<template>
  <app-header />
  <app-navigation-drawer :items="navItems" />

  <v-main>
    <div class="app-content pa-4 pa-sm-5 pa-md-6">
      <router-view />
    </div>
  </v-main>

  <app-bottom-navigation :items="navItems" />
  <global-snackbar />
</template>

<style scoped>
.app-content {
  width: 100%;
  max-width: 1600px;
  margin-inline: auto;
}
</style>
