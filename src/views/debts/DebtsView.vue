<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { AlertTriangle } from 'lucide-vue-next'
import { obterContasAReceber, faixaEnvelhecimento, type DividaCliente } from '@/services/debts'
import Card from '@/components/ui/Card.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Badge from '@/components/ui/Badge.vue'
import { formatCurrency } from '@/utils/currency'

const router = useRouter()
const carregando = ref(true)
const dividas = ref<DividaCliente[]>([])
const pesquisa = ref('')
const filtroZona = ref('')

onMounted(async () => {
  dividas.value = await obterContasAReceber()
  carregando.value = false
})

const zonas = computed(() => [...new Set(dividas.value.map((d) => d.cliente.zona))].sort())
const opcoesZona = computed(() => [{ value: '', label: 'Todas as zonas' }, ...zonas.value.map((z) => ({ value: z, label: z }))])

const filtradas = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase()
  return dividas.value.filter((d) => {
    const okZona = !filtroZona.value || d.cliente.zona === filtroZona.value
    const okTermo = !termo || d.cliente.nome.toLowerCase().includes(termo) || d.cliente.codigo.toLowerCase().includes(termo)
    return okZona && okTermo
  })
})

const totalGeral = computed(() => filtradas.value.reduce((soma, d) => soma + d.totalDivida, 0))

const FAIXAS = ['0-30', '31-60', '61-90', '90+'] as const
const porFaixa = computed(() => {
  const mapa: Record<string, number> = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0 }
  for (const d of filtradas.value) {
    mapa[faixaEnvelhecimento(d.diasAtraso)] += d.totalDivida
  }
  return mapa
})

const FAIXA_LABEL: Record<string, string> = {
  '0-30': '0-30 dias',
  '31-60': '31-60 dias',
  '61-90': '61-90 dias',
  '90+': '90+ dias',
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-[hsl(var(--foreground))]">Dívidas</h1>

    <div class="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-5">
      <Card class="p-4">
        <p class="text-xs text-[hsl(var(--muted-foreground))]">Total em Dívida</p>
        <p class="mt-1 text-xl font-bold text-[hsl(var(--destructive))]">{{ formatCurrency(totalGeral) }}</p>
      </Card>
      <Card v-for="faixa in FAIXAS" :key="faixa" class="p-4">
        <p class="text-xs text-[hsl(var(--muted-foreground))]">{{ FAIXA_LABEL[faixa] }}</p>
        <p class="mt-1 text-xl font-bold">{{ formatCurrency(porFaixa[faixa]) }}</p>
      </Card>
    </div>

    <div class="mb-4 flex flex-wrap gap-3">
      <Input v-model="pesquisa" placeholder="Pesquisar cliente ou código…" class="max-w-xs" />
      <Select v-model="filtroZona" :options="opcoesZona" class="max-w-xs" />
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Cliente</th>
            <th class="px-4 py-3 font-medium">Zona</th>
            <th class="px-4 py-3 font-medium text-right">Faturas em Aberto</th>
            <th class="px-4 py-3 font-medium text-right">Dias em Atraso</th>
            <th class="px-4 py-3 font-medium">Faixa</th>
            <th class="px-4 py-3 font-medium text-right">Total em Dívida</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="d in filtradas"
            :key="d.cliente.id"
            class="cursor-pointer border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--accent))]"
            @click="router.push(`/clientes/${d.cliente.id}`)"
          >
            <td class="px-4 py-3">
              <p class="font-medium">{{ d.cliente.nome }}</p>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">{{ d.cliente.codigo }}</p>
            </td>
            <td class="px-4 py-3">{{ d.cliente.zona }}</td>
            <td class="px-4 py-3 text-right">{{ d.faturasEmAberto }}</td>
            <td class="px-4 py-3 text-right">{{ d.diasAtraso }}</td>
            <td class="px-4 py-3">
              <Badge :tone="d.diasAtraso > 60 ? 'destructive' : d.diasAtraso > 30 ? 'warning' : 'muted'">
                {{ FAIXA_LABEL[faixaEnvelhecimento(d.diasAtraso)] }}
              </Badge>
            </td>
            <td class="px-4 py-3 text-right font-medium text-[hsl(var(--destructive))]">{{ formatCurrency(d.totalDivida) }}</td>
          </tr>
          <tr v-if="!carregando && filtradas.length === 0">
            <td colspan="6" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">
              <AlertTriangle :size="24" class="mx-auto mb-2 text-[hsl(var(--success))]" />
              Nenhum cliente em dívida.
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="mt-2 text-xs text-[hsl(var(--muted-foreground))]">Clique num cliente para ver o extrato financeiro completo.</p>
  </div>
</template>
