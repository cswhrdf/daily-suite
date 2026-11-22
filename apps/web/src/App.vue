<script setup lang="ts">
// 根组件只承载全局布局骨架，具体页面由路由渲染。
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="compact" flat>
      <v-app-bar-title>Daily Suite</v-app-bar-title>
    </v-app-bar>

    <v-main>
      <router-view />
    </v-main>
  </v-app>
</template>
