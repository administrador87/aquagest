<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { FileText } from 'lucide-vue-next'
import { useReceiptsStore } from '@/stores/receipts'
import { useCustomersStore } from '@/stores/customers'
import { useSettingsStore } from '@/stores/settings'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency } from '@/utils/currency'
import { gerarPdfRecibo, abrirPdfEmNovaAba } from '@/utils/pdf'
import type { PaymentMethod } from '@/types/models'

const receiptsStore = useReceiptsStore()
const customersStore = useCustomersStore()
const settings = useSettingsStore()

onMounted(() => {
  receiptsStore.ouvir()
  customersStore.ouvir()
})
onUnmounted(() => {
  receiptsStore.pararDeOuvir()
  customersStore.pararDeOuvir()
})

function nomeCliente(clienteId: string) {
  return customersStore.porId(clienteId)?.nome ?? '—'
}

const METODO_LABEL: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  outro: 'Outro',
}

function verPdf(reciboId: string) {
  const recibo = receiptsStore.ordenados.find((r) => r.id === reciboId)
  if (!recibo) return
  const cliente = customersStore.porId(recibo.clienteId)
  if (!cliente) return
  abrirPdfEmNovaAba(gerarPdfRecibo(recibo, cliente, settings.dados))
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-[hsl(var(--foreground))]">Recibos</h1>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Número</th>
            <th class="px-4 py-3 font-medium">Data</th>
            <th class="px-4 py-3 font-medium">Cliente</th>
            <th class="px-4 py-3 font-medium">Método</th>
            <th class="px-4 py-3 font-medium text-right">Valor</th>
            <th class="px-4 py-3 font-medium text-right">Saldo Restante</th>
            <th class="px-4 py-3 font-medium text-right">PDF</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in receiptsStore.ordenados" :key="r.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="px-4 py-3 font-medium">{{ r.numero }}</td>
            <td class="px-4 py-3">{{ formatDate(r.data) }}</td>
            <td class="px-4 py-3">{{ nomeCliente(r.clienteId) }}</td>
            <td class="px-4 py-3">{{ METODO_LABEL[r.metodo] }}</td>
            <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(r.valorRecebido) }}</td>
            <td class="px-4 py-3 text-right" :class="r.saldoRestante > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'">
              {{ formatCurrency(r.saldoRestante) }}
            </td>
            <td class="px-4 py-3 text-right">
              <button class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]" @click="verPdf(r.id)">
                <FileText :size="16" />
              </button>
            </td>
          </tr>
          <tr v-if="!receiptsStore.carregando && receiptsStore.ordenados.length === 0">
            <td colspan="7" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Nenhum recibo emitido.</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
