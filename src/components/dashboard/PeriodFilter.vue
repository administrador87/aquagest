<script setup lang="ts">
import { cn } from '@/utils/cn'
import type { PeriodPreset } from '@/utils/dateRange'

const model = defineModel<PeriodPreset>({ required: true })

const inicioPersonalizado = defineModel<string>('inicioPersonalizado')
const fimPersonalizado = defineModel<string>('fimPersonalizado')

const OPCOES: { value: PeriodPreset; label: string }[] = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'semana', label: 'Esta semana' },
  { value: 'mes', label: 'Este mês' },
  { value: 'ano', label: 'Este ano' },
  { value: 'personalizado', label: 'Personalizado' },
]
</script>

<template>
  <div class="flex flex-wrap items-center gap-2">
    <button
      v-for="opcao in OPCOES"
      :key="opcao.value"
      :class="
        cn(
          'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
          model === opcao.value
            ? 'bg-[hsl(var(--primary))] text-white'
            : 'bg-white text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))] border border-[hsl(var(--border))]',
        )
      "
      @click="model = opcao.value"
    >
      {{ opcao.label }}
    </button>

    <template v-if="model === 'personalizado'">
      <input v-model="inicioPersonalizado" type="date" class="h-9 rounded-md border border-[hsl(var(--border))] px-2 text-sm" />
      <span class="text-sm text-[hsl(var(--muted-foreground))]">até</span>
      <input v-model="fimPersonalizado" type="date" class="h-9 rounded-md border border-[hsl(var(--border))] px-2 text-sm" />
    </template>
  </div>
</template>
