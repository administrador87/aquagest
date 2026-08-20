<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useCustomersStore } from '@/stores/customers'
import { useMetersStore } from '@/stores/meters'
import { useInvoicesStore } from '@/stores/invoices'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import { formatDate } from '@/utils/dateRange'
import type { MeterReading } from '@/types/models'

const props = defineProps<{ clienteIdFixo?: string }>()
const emit = defineEmits<{ gerada: []; cancelar: [] }>()

const customersStore = useCustomersStore()
const metersStore = useMetersStore()
const invoicesStore = useInvoicesStore()

const clienteId = ref(props.clienteIdFixo ?? '')
const leiturasPorFaturar = ref<MeterReading[]>([])
const aCarregarLeituras = ref(false)
const leituraSelecionada = ref('')
const aGerar = ref(false)
const erro = ref('')

onMounted(() => {
  customersStore.ouvir()
  metersStore.ouvir()
})

const opcoesClientes = computed(() => customersStore.itens.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nome}` })))

function numeroContador(contadorId: string) {
  return metersStore.porId(contadorId)?.numero ?? '—'
}

const opcoesLeituras = computed(() =>
  leiturasPorFaturar.value.map((l) => ({
    value: l.id,
    label: `${formatDate(l.data)} · Contador ${numeroContador(l.contadorId)} · Consumo ${l.consumo.toFixed(2)} m³`,
  })),
)

watch(
  clienteId,
  async (id) => {
    leituraSelecionada.value = ''
    leiturasPorFaturar.value = []
    if (!id) return
    aCarregarLeituras.value = true
    try {
      leiturasPorFaturar.value = await invoicesStore.leiturasPorFaturar(id)
    } finally {
      aCarregarLeituras.value = false
    }
  },
  { immediate: true },
)

async function gerar() {
  erro.value = ''
  if (!leituraSelecionada.value) {
    erro.value = 'Selecione a leitura a faturar.'
    return
  }
  aGerar.value = true
  try {
    await invoicesStore.gerarDeLeitura(leituraSelecionada.value)
    emit('gerada')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível gerar a fatura.'
  } finally {
    aGerar.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div v-if="!clienteIdFixo">
      <label class="mb-1 block text-sm font-medium">Cliente</label>
      <Select v-model="clienteId" :options="opcoesClientes" placeholder="Selecione o cliente" />
    </div>

    <div v-if="clienteId">
      <label class="mb-1 block text-sm font-medium">Leitura por faturar</label>
      <p v-if="aCarregarLeituras" class="text-sm text-[hsl(var(--muted-foreground))]">A procurar leituras…</p>
      <p v-else-if="opcoesLeituras.length === 0" class="text-sm text-[hsl(var(--warning))]">
        Este cliente não tem leituras por faturar.
      </p>
      <Select v-else v-model="leituraSelecionada" :options="opcoesLeituras" placeholder="Selecione a leitura" />
    </div>

    <p v-if="erro" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro }}</p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="button" :disabled="aGerar || !leituraSelecionada" @click="gerar">
        {{ aGerar ? 'A gerar…' : 'Gerar Fatura' }}
      </Button>
    </div>
  </div>
</template>
