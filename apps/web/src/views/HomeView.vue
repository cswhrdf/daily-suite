<script setup lang="ts">
const features = [
  'Vue 3 + TypeScript + Vite',
  'Vuetify 3 组件与主题',
  'Vue Router 4 路由',
  'Pinia 状态管理',
] as const
</script>

<template>
  <v-container class="home-view" max-width="960">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="pa-6" elevation="4" rounded="lg">
          <v-card-title class="text-h5">Daily Suite 前端脚手架</v-card-title>
          <v-card-text>
            <p class="mb-4">基础工程已就绪，当前具备以下能力：</p>
            <v-list density="compact">
              <v-list-item v-for="feature in features" :key="feature" :title="feature">
                <template #prepend>
                  <v-icon color="primary" icon="mdi-check-circle" />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" variant="flat">主按钮</v-btn>
            <v-btn color="secondary" variant="tonal">次按钮</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
