<script setup lang="ts">
import { cn } from '@/utils/cn'

type Variant = 'default' | 'outline' | 'ghost' | 'destructive' | 'success'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const props = withDefaults(
  defineProps<{
    variant?: Variant
    size?: Size
    type?: 'button' | 'submit' | 'reset'
    disabled?: boolean
  }>(),
  { variant: 'default', size: 'md', type: 'button', disabled: false },
)

const variantClasses: Record<Variant, string> = {
  default: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:opacity-90',
  outline: 'border border-[hsl(var(--border))] bg-transparent hover:bg-[hsl(var(--accent))]',
  ghost: 'bg-transparent hover:bg-[hsl(var(--accent))]',
  destructive: 'bg-[hsl(var(--destructive))] text-[hsl(var(--destructive-foreground))] hover:opacity-90',
  success: 'bg-[hsl(var(--success))] text-[hsl(var(--success-foreground))] hover:opacity-90',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-10 w-10',
}
</script>

<template>
  <button
    :type="props.type"
    :disabled="props.disabled"
    :class="
      cn(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
        variantClasses[props.variant],
        sizeClasses[props.size],
      )
    "
  >
    <slot />
  </button>
</template>
