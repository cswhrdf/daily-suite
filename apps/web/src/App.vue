<script setup lang="ts">
import { onUnmounted } from 'vue'

import { useThemeStore } from '@/stores/theme'

// 根组件只提供应用边界；认证布局与公共页面由路由分别承载。
const themeStore = useThemeStore()
const stopThemeSync = themeStore.initialize()

onUnmounted(stopThemeSync)
</script>

<template>
  <v-app>
    <router-view />
  </v-app>
</template>
