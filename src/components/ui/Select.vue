<script setup lang="ts">
import { cn } from '@/utils/cn'

defineProps<{ options: { value: string; label: string }[]; placeholder?: string }>()
const model = defineModel<string>()
</script>

<template>
  <select
    v-model="model"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-white px-3 py-2 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1',
      )
    "
  >
    <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
    <option v-for="opt in options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
  </select>
</template>
