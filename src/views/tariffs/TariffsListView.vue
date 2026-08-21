<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import { useTariffsStore } from '@/stores/tariffs'
import { usePermissions } from '@/composables/usePermissions'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Card from '@/components/ui/Card.vue'
import Dialog from '@/components/ui/Dialog.vue'
import TariffForm from '@/components/tariffs/TariffForm.vue'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency, formatNumber } from '@/utils/currency'
import type { Tariff } from '@/types/models'

const store = useTariffsStore()
const { pode } = usePermissions()

const dialogAberto = ref(false)
const aGuardar = ref(false)

onMounted(() => store.ouvir())
onUnmounted(() => store.pararDeOuvir())

async function submeter(dados: Omit<Tariff, 'id' | 'criadoEm' | 'ativa' | 'validoAte'>) {
  aGuardar.value = true
  try {
    await store.criar(dados)
    dialogAberto.value = false
  } finally {
    aGuardar.value = false
  }
}

async function remover(tarifa: Tariff) {
  if (!confirm(`Apagar a tarifa "${tarifa.nome}" do histórico? Esta ação não pode ser revertida.`)) return
  try {
    await store.remover(tarifa.id)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Não foi possível apagar a tarifa.')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Tarifas</h1>
      <Button v-if="pode('tariffs', 'create')" @click="dialogAberto = true">
        <Plus :size="16" /> Nova Versão de Tarifa
      </Button>
    </div>

    <p v-if="!store.carregando && store.historico.length === 0" class="py-12 text-center text-sm text-[hsl(var(--muted-foreground))]">
      Nenhuma tarifa configurada. Crie a primeira versão para poder faturar clientes.
    </p>

    <div class="flex flex-col gap-4">
      <div v-for="tarifa in store.historico" :key="tarifa.id" class="flex items-start gap-2">
        <Card class="flex-1 p-5">
          <div class="mb-3 flex items-center justify-between">
            <div>
              <p class="font-semibold">{{ tarifa.nome }}</p>
              <p class="text-xs text-[hsl(var(--muted-foreground))]">
                Válida desde {{ formatDate(tarifa.validoDesde) }}{{ tarifa.validoAte ? ` até ${formatDate(tarifa.validoAte)}` : '' }}
              </p>
            </div>
            <Badge :tone="tarifa.ativa ? 'success' : 'muted'">{{ tarifa.ativa ? 'Ativa' : 'Histórico' }}</Badge>
          </div>

          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
                <th class="py-1 font-medium">Escalão (m³)</th>
                <th class="py-1 font-medium text-right">Preço/m³</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(e, i) in tarifa.escaloes" :key="i" class="border-b border-[hsl(var(--border))] last:border-0">
                <td class="py-1">{{ e.deM3 }} — {{ e.ateM3 ?? '∞' }}</td>
                <td class="py-1 text-right">{{ formatCurrency(e.precoM3) }}</td>
              </tr>
            </tbody>
          </table>

          <div class="mt-3 grid grid-cols-2 gap-2 text-xs text-[hsl(var(--muted-foreground))] sm:grid-cols-4">
            <div>Taxa fixa: <span class="font-medium text-[hsl(var(--foreground))]">{{ formatCurrency(tarifa.taxaFixa) }}</span></div>
            <div>Manutenção: <span class="font-medium text-[hsl(var(--foreground))]">{{ formatCurrency(tarifa.taxaManutencao) }}</span></div>
            <div>Imposto: <span class="font-medium text-[hsl(var(--foreground))]">{{ formatNumber(tarifa.impostoPercentagem) }}%</span></div>
            <div v-if="tarifa.outrasTaxas.length">Outras taxas: <span class="font-medium text-[hsl(var(--foreground))]">{{ tarifa.outrasTaxas.length }}</span></div>
          </div>
        </Card>

        <button
          v-if="pode('tariffs', 'delete') && !tarifa.ativa"
          class="mt-1 rounded-md p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
          title="Apagar do histórico"
          @click="remover(tarifa)"
        >
          <Trash2 :size="18" />
        </button>
      </div>
    </div>

    <Dialog v-model:open="dialogAberto" title="Nova Versão de Tarifa">
      <TariffForm :a-guardar="aGuardar" @submeter="submeter" @cancelar="dialogAberto = false" />
    </Dialog>
  </div>
</template>
