<script setup lang="ts">
import { cn } from '@/utils/cn'

defineProps<{ type?: string; placeholder?: string; disabled?: boolean }>()
const model = defineModel<string | number | null>()
</script>

<template>
  <input
    v-model="model"
    :type="type ?? 'text'"
    :placeholder="placeholder"
    :disabled="disabled"
    :class="
      cn(
        'flex h-10 w-full rounded-md border border-[hsl(var(--input))] bg-white px-3 py-2 text-sm',
        'placeholder:text-[hsl(var(--muted-foreground))]',
        'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )
    "
  />
</template>
