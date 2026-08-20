<script setup lang="ts">
import { cn } from '@/utils/cn'

defineProps<{ class?: string }>()
</script>

<template>
  <div :class="cn('rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] shadow-sm', $props.class)">
    <slot />
  </div>
</template>
