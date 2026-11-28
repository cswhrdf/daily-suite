<script setup lang="ts">
withDefaults(
  defineProps<{
    icon?: string
    title: string
    description?: string
  }>(),
  {
    icon: 'mdi-information-outline',
    description: '',
  },
)
</script>

<template>
  <v-sheet class="app-empty-state" rounded="lg">
    <v-icon aria-hidden="true" color="primary" :icon="icon" size="48" />
    <h2 class="text-h6 mt-4">{{ title }}</h2>
    <p v-if="description !== ''" class="text-body-2 text-medium-emphasis mt-2 mb-0">
      {{ description }}
    </p>
    <div v-if="$slots['action']" class="mt-5">
      <slot name="action" />
    </div>
  </v-sheet>
</template>

<style scoped>
.app-empty-state {
  padding: 32px;
  text-align: center;
}
</style>
