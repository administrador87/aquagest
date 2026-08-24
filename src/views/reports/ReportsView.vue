<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { FileDown, FileSpreadsheet, BarChart3 } from 'lucide-vue-next'
import { gerarRelatorio, REPORTS, type ReportId, type ReportResult } from '@/services/reports'
import { exportarRelatorioExcel, exportarRelatorioPdf } from '@/utils/reportExport'
import { getPeriodRange, type PeriodPreset } from '@/utils/dateRange'
import { useCustomersStore } from '@/stores/customers'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import Card from '@/components/ui/Card.vue'
import PeriodFilter from '@/components/dashboard/PeriodFilter.vue'

const customersStore = useCustomersStore()
onMounted(() => customersStore.ouvir())
onUnmounted(() => customersStore.pararDeOuvir())

const relatorioId = ref<ReportId>('faturacao_periodo')
const periodo = ref<PeriodPreset>('mes')
const inicioPersonalizado = ref('')
const fimPersonalizado = ref('')
const clienteId = ref('')
const resultado = ref<ReportResult | null>(null)
const aGerar = ref(false)

const opcoesRelatorios = computed(() => REPORTS.map((r) => ({ value: r.id, label: r.label })))
const relatorioAtual = computed(() => REPORTS.find((r) => r.id === relatorioId.value)!)

const opcoesClientes = computed(() =>
  [...customersStore.itens].sort((a, b) => a.nome.localeCompare(b.nome)).map((c) => ({ value: c.id, label: `${c.nome} (${c.codigo})` })),
)

const intervalo = computed(() => {
  if (periodo.value === 'personalizado' && inicioPersonalizado.value && fimPersonalizado.value) {
    return getPeriodRange('personalizado', {
      inicio: new Date(inicioPersonalizado.value).getTime(),
      fim: new Date(fimPersonalizado.value).getTime(),
    })
  }
  return getPeriodRange(periodo.value === 'personalizado' ? 'ano' : periodo.value)
})

const podeGerar = computed(() => !relatorioAtual.value.usaCliente || !!clienteId.value)

async function gerar() {
  aGerar.value = true
  try {
    resultado.value = await gerarRelatorio(relatorioId.value, intervalo.value, { clienteId: clienteId.value || undefined })
  } finally {
    aGerar.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-[hsl(var(--foreground))]">Relatórios</h1>

    <Card class="mb-6 p-5">
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label class="mb-1 block text-sm font-medium">Relatório</label>
            <Select v-model="relatorioId" :options="opcoesRelatorios" />
          </div>
        </div>

        <div v-if="relatorioAtual.usaCliente" class="sm:max-w-sm">
          <label class="mb-1 block text-sm font-medium">Cliente</label>
          <Select v-model="clienteId" :options="[{ value: '', label: 'Selecione um cliente…' }, ...opcoesClientes]" />
        </div>

        <div v-if="relatorioAtual.usaPeriodo">
          <label class="mb-1 block text-sm font-medium">Período</label>
          <PeriodFilter v-model="periodo" v-model:inicioPersonalizado="inicioPersonalizado" v-model:fimPersonalizado="fimPersonalizado" />
        </div>

        <div>
          <Button :disabled="aGerar || !podeGerar" @click="gerar">
            <BarChart3 :size="16" /> {{ aGerar ? 'A gerar…' : 'Gerar Relatório' }}
          </Button>
        </div>
      </div>
    </Card>

    <Card v-if="resultado" class="p-5">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 class="text-lg font-semibold">{{ resultado.titulo }}</h2>
        <div class="flex gap-2">
          <Button variant="outline" size="sm" @click="exportarRelatorioPdf(resultado)">
            <FileDown :size="14" /> PDF
          </Button>
          <Button variant="outline" size="sm" @click="exportarRelatorioExcel(resultado)">
            <FileSpreadsheet :size="14" /> Excel
          </Button>
        </div>
      </div>

      <p v-if="resultado.linhas.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Sem dados para este relatório.</p>
      <div v-else class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
              <th v-for="col in resultado.colunas" :key="col" class="whitespace-nowrap px-2 py-2 font-medium">{{ col }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(linha, i) in resultado.linhas" :key="i" class="border-b border-[hsl(var(--border))] last:border-0">
              <td v-for="(valor, j) in linha" :key="j" class="whitespace-nowrap px-2 py-2">{{ valor }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </div>
</template>
