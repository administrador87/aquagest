<script setup lang="ts">
defineProps<{ for?: string }>()
</script>

<template>
  <label :for="$props.for" class="mb-1 block text-sm font-medium text-[hsl(var(--foreground))]">
    <slot />
  </label>
</template>
