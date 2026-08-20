<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Users,
  UserCheck,
  PlugZap,
  FileText,
  Wallet,
  AlertCircle,
  Clock,
  CalendarClock,
  Droplets,
  CalendarDays,
} from 'lucide-vue-next'
import { obterEstatisticasDashboard, type DashboardStats } from '@/services/dashboard'
import { getPeriodRange, monthLabel, formatDate, type PeriodPreset } from '@/utils/dateRange'
import { formatCurrency, formatNumber } from '@/utils/currency'
import Card from '@/components/ui/Card.vue'
import StatCard from '@/components/dashboard/StatCard.vue'
import PeriodFilter from '@/components/dashboard/PeriodFilter.vue'

const periodo = ref<PeriodPreset>('mes')
const inicioPersonalizado = ref('')
const fimPersonalizado = ref('')
const stats = ref<DashboardStats | null>(null)
const aCarregar = ref(true)

const intervalo = computed(() => {
  if (periodo.value === 'personalizado' && inicioPersonalizado.value && fimPersonalizado.value) {
    return getPeriodRange('personalizado', {
      inicio: new Date(inicioPersonalizado.value).getTime(),
      fim: new Date(fimPersonalizado.value).getTime(),
    })
  }
  return getPeriodRange(periodo.value === 'personalizado' ? 'mes' : periodo.value)
})

async function carregar() {
  aCarregar.value = true
  stats.value = await obterEstatisticasDashboard(intervalo.value)
  aCarregar.value = false
}

onMounted(carregar)
watch(intervalo, carregar)

const chartConsumo = computed(() => ({
  labels: stats.value?.evolucaoConsumoMensal.map((e) => monthLabel(e.mes)) ?? [],
  datasets: [
    {
      label: 'Consumo (m³)',
      data: stats.value?.evolucaoConsumoMensal.map((e) => e.valor) ?? [],
      backgroundColor: '#0369a1',
      borderRadius: 4,
    },
  ],
}))

const chartFaturacao = computed(() => ({
  labels: stats.value?.evolucaoFaturacaoMensal.map((e) => monthLabel(e.mes)) ?? [],
  datasets: [
    {
      label: 'Faturação',
      data: stats.value?.evolucaoFaturacaoMensal.map((e) => e.valor) ?? [],
      borderColor: '#0369a1',
      backgroundColor: '#0369a133',
      tension: 0.3,
      fill: true,
    },
  ],
}))

const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }

const METODO_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  outro: 'Outro',
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Dashboard</h1>
      <PeriodFilter
        v-model="periodo"
        v-model:inicioPersonalizado="inicioPersonalizado"
        v-model:fimPersonalizado="fimPersonalizado"
      />
    </div>

    <div v-if="aCarregar" class="py-24 text-center text-sm text-[hsl(var(--muted-foreground))]">A carregar dados…</div>

    <template v-else-if="stats">
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <StatCard titulo="Total de Clientes" :valor="String(stats.totalClientes)" :icon="Users" />
        <StatCard titulo="Clientes Ativos" :valor="String(stats.clientesAtivos)" :icon="UserCheck" tone="success" />
        <StatCard titulo="Novas Ligações" :valor="String(stats.novasLigacoes)" :icon="PlugZap" sublinha="no período" />
        <StatCard titulo="Total Faturado" :valor="formatCurrency(stats.totalFaturado)" :icon="FileText" sublinha="no período" />
        <StatCard titulo="Total Recebido" :valor="formatCurrency(stats.totalRecebido)" :icon="Wallet" tone="success" sublinha="no período" />
        <StatCard titulo="Total em Dívida" :valor="formatCurrency(stats.totalEmDivida)" :icon="AlertCircle" tone="destructive" />
        <StatCard titulo="Faturas Pendentes" :valor="String(stats.faturasPendentes)" :icon="Clock" tone="warning" />
        <StatCard titulo="Faturas Vencidas" :valor="String(stats.faturasVencidas)" :icon="CalendarClock" tone="destructive" />
        <StatCard titulo="Consumo Total" :valor="`${formatNumber(stats.consumoTotal, 1)} m³`" :icon="Droplets" />
        <StatCard titulo="Consumo do Mês" :valor="`${formatNumber(stats.consumoDoMes, 1)} m³`" :icon="CalendarDays" />
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card class="p-4">
          <h2 class="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">Evolução Mensal do Consumo</h2>
          <div class="h-64"><Bar :data="chartConsumo" :options="chartOptions" /></div>
        </Card>
        <Card class="p-4">
          <h2 class="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">Evolução Mensal da Faturação</h2>
          <div class="h-64"><Line :data="chartFaturacao" :options="chartOptions" /></div>
        </Card>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card class="p-4">
          <h2 class="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">Pagamentos Recentes</h2>
          <p v-if="stats.pagamentosRecentes.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Ainda não há pagamentos registados.
          </p>
          <table v-else class="w-full text-sm">
            <tbody>
              <tr v-for="p in stats.pagamentosRecentes" :key="p.id" class="border-b border-[hsl(var(--border))] last:border-0">
                <td class="py-2 text-[hsl(var(--muted-foreground))]">{{ formatDate(p.data) }}</td>
                <td class="py-2">{{ METODO_LABEL[p.metodo] }}</td>
                <td class="py-2 text-right font-medium">{{ formatCurrency(p.valor) }}</td>
              </tr>
            </tbody>
          </table>
        </Card>

        <Card class="p-4">
          <h2 class="mb-3 text-sm font-semibold text-[hsl(var(--foreground))]">Clientes com Maiores Dívidas</h2>
          <p v-if="stats.clientesComMaisDivida.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
            Nenhum cliente com dívida no momento.
          </p>
          <table v-else class="w-full text-sm">
            <tbody>
              <tr v-for="c in stats.clientesComMaisDivida" :key="c.id" class="border-b border-[hsl(var(--border))] last:border-0">
                <td class="py-2">{{ c.nome }}</td>
                <td class="py-2 text-[hsl(var(--muted-foreground))]">{{ c.codigo }}</td>
                <td class="py-2 text-right font-medium text-[hsl(var(--destructive))]">{{ formatCurrency(c.saldoAtual) }}</td>
              </tr>
            </tbody>
          </table>
        </Card>
      </div>
    </template>
  </div>
</template>
