<script setup lang="ts">
import { cn } from '@/utils/cn'
import Card from '@/components/ui/Card.vue'

type Tone = 'default' | 'success' | 'warning' | 'destructive'

const props = withDefaults(
  defineProps<{ titulo: string; valor: string; icon: unknown; tone?: Tone; sublinha?: string }>(),
  { tone: 'default' },
)

const toneClasses: Record<Tone, string> = {
  default: 'bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]',
  success: 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]',
  warning: 'bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))]',
  destructive: 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]',
}
</script>

<template>
  <Card class="p-4">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-xs font-medium text-[hsl(var(--muted-foreground))]">{{ titulo }}</p>
        <p class="mt-1 text-2xl font-bold text-[hsl(var(--foreground))]">{{ valor }}</p>
        <p v-if="sublinha" class="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">{{ sublinha }}</p>
      </div>
      <div :class="cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg', toneClasses[props.tone])">
        <component :is="icon" :size="20" />
      </div>
    </div>
  </Card>
</template>
