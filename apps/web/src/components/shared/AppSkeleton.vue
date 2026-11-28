<script setup lang="ts">
withDefaults(
  defineProps<{
    height?: string | number
    type?: string
  }>(),
  {
    height: 160,
    type: 'image',
  },
)
</script>

<template>
  <v-skeleton-loader :height="height" :type="type" />
</template>
