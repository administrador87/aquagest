<script setup lang="ts">
import { cn } from '@/utils/cn'

const props = defineProps<{ type?: string; placeholder?: string; disabled?: boolean }>()
const model = defineModel<string | number | null>()

// Campos numéricos usam type="text" + inputmode="decimal" em vez de type="number": o input
// nativo type="number" só aceita "." como separador decimal e rejeita "," (comum em pt-PT/pt-MZ),
// fazendo o campo parecer "não aceitar" o que a pessoa escreve. Mantemos o teclado numérico no
// telemóvel via inputmode, e normalizamos "," para "." para o valor continuar a ser um número válido.
function onInput(evento: Event) {
  const alvo = evento.target as HTMLInputElement
  model.value = props.type === 'number' ? alvo.value.replace(',', '.') : alvo.value
}
</script>

<template>
  <input
    :value="model ?? ''"
    :type="type === 'number' ? 'text' : (type ?? 'text')"
    :inputmode="type === 'number' ? 'decimal' : undefined"
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
    @input="onInput"
  />
</template>
