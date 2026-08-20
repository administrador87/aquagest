<script setup lang="ts">
import { cn } from '@/utils/cn'

type Tone = 'default' | 'success' | 'warning' | 'destructive' | 'muted'

const props = withDefaults(defineProps<{ tone?: Tone }>(), { tone: 'default' })

const toneClasses: Record<Tone, string> = {
  default: 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]',
  success: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
  destructive: 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]',
  muted: 'bg-[hsl(var(--muted))] text-[hsl(var(--muted-foreground))]',
}
</script>

<template>
  <span
    :class="
      cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap', toneClasses[props.tone])
    "
  >
    <slot />
  </span>
</template>
