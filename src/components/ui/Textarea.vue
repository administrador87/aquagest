<script setup lang="ts">
import { cn } from '@/utils/cn'

defineProps<{ placeholder?: string; rows?: number }>()
const model = defineModel<string>()
</script>

<template>
  <textarea
    v-model="model"
    :placeholder="placeholder"
    :rows="rows ?? 3"
    :class="
      cn(
        'flex w-full rounded-md border border-[hsl(var(--input))] bg-white px-3 py-2 text-sm',
        'placeholder:text-[hsl(var(--muted-foreground))]',
        'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))] focus:ring-offset-1',
      )
    "
  />
</template>
