<script setup lang="ts">
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 能力清单只保留 key，文案本身放进各语言文件。
const featureKeys = [
  'home.features.vue',
  'home.features.vuetify',
  'home.features.router',
  'home.features.pinia',
] as const
</script>

<template>
  <v-container class="home-view" max-width="960">
    <v-row justify="center">
      <v-col cols="12" md="8">
        <v-card class="pa-6" elevation="4" rounded="lg">
          <v-card-title class="text-h5">{{ t('home.title') }}</v-card-title>
          <v-card-text>
            <p class="mb-4">{{ t('home.intro') }}</p>
            <v-list density="compact">
              <v-list-item v-for="key in featureKeys" :key="key" :title="t(key)">
                <template #prepend>
                  <v-icon color="primary" icon="mdi-check-circle" />
                </template>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn color="primary" variant="flat">{{ t('home.primaryAction') }}</v-btn>
            <v-btn color="secondary" variant="tonal">{{ t('home.secondaryAction') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>
