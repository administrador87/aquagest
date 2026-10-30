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
const leiturasSelecionadas = ref<string[]>([])
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

const consumoSelecionado = computed(() =>
  leiturasPorFaturar.value.filter((l) => leiturasSelecionadas.value.includes(l.id)).reduce((soma, l) => soma + l.consumo, 0),
)

watch(
  clienteId,
  async (id) => {
    leiturasSelecionadas.value = []
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
  if (leiturasSelecionadas.value.length === 0) {
    erro.value = 'Selecione pelo menos uma leitura a faturar.'
    return
  }
  aGerar.value = true
  try {
    await invoicesStore.gerarDeLeituras(leiturasSelecionadas.value)
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
      <label class="mb-1 block text-sm font-medium">Leituras por faturar</label>
      <p v-if="aCarregarLeituras" class="text-sm text-[hsl(var(--muted-foreground))]">A procurar leituras…</p>
      <p v-else-if="leiturasPorFaturar.length === 0" class="text-sm text-[hsl(var(--warning))]">
        Este cliente não tem leituras por faturar.
      </p>
      <template v-else>
        <div class="flex flex-col gap-1 rounded-md border border-[hsl(var(--border))] p-2">
          <label
            v-for="l in leiturasPorFaturar"
            :key="l.id"
            class="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-[hsl(var(--accent))]"
          >
            <input v-model="leiturasSelecionadas" type="checkbox" :value="l.id" />
            {{ formatDate(l.data) }} · Contador {{ numeroContador(l.contadorId) }} · Consumo {{ l.consumo.toFixed(2) }} m³
          </label>
        </div>
        <p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          <template v-if="leiturasSelecionadas.length > 1">
            {{ leiturasSelecionadas.length }} leituras numa só factura ({{ consumoSelecionado.toFixed(2) }} m³ no total). Cada
            contador é calculado à parte pelos escalões da tarifa e os valores somam-se; as taxas fixas cobram-se uma só vez.
          </template>
          <template v-else>Marque mais do que uma leitura para as juntar numa só factura.</template>
        </p>
      </template>
    </div>

    <p v-if="erro" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro }}</p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="button" :disabled="aGerar || leiturasSelecionadas.length === 0" @click="gerar">
        {{ aGerar ? 'A gerar…' : 'Gerar Fatura' }}
      </Button>
    </div>
  </div>
</template>
