<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { usePaymentsStore } from '@/stores/payments'
import { useCustomersStore } from '@/stores/customers'
import { usePermissions } from '@/composables/usePermissions'
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import PaymentForm from '@/components/payments/PaymentForm.vue'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency } from '@/utils/currency'
import type { PaymentMethod } from '@/types/models'

const paymentsStore = usePaymentsStore()
const customersStore = useCustomersStore()
const { pode } = usePermissions()

const dialogAberto = ref(false)
const aGuardar = ref(false)
const erro = ref('')

onMounted(() => {
  paymentsStore.ouvir()
  customersStore.ouvir()
})
onUnmounted(() => {
  paymentsStore.pararDeOuvir()
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

async function submeter(dados: { clienteId: string; valor: number; metodo: PaymentMethod; referencia?: string; observacoes?: string }) {
  erro.value = ''
  aGuardar.value = true
  try {
    await paymentsStore.registar(dados)
    dialogAberto.value = false
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível registar o pagamento.'
  } finally {
    aGuardar.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Pagamentos</h1>
      <Button v-if="pode('payments', 'create')" @click="dialogAberto = true; erro = ''">
        <Plus :size="16" /> Registar Pagamento
      </Button>
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Data</th>
            <th class="px-4 py-3 font-medium">Cliente</th>
            <th class="px-4 py-3 font-medium">Método</th>
            <th class="px-4 py-3 font-medium">Referência</th>
            <th class="px-4 py-3 font-medium">Operador</th>
            <th class="px-4 py-3 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in paymentsStore.ordenados" :key="p.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="px-4 py-3">{{ formatDate(p.data) }}</td>
            <td class="px-4 py-3">{{ nomeCliente(p.clienteId) }}</td>
            <td class="px-4 py-3">{{ METODO_LABEL[p.metodo] }}</td>
            <td class="px-4 py-3 text-[hsl(var(--muted-foreground))]">{{ p.referencia || '—' }}</td>
            <td class="px-4 py-3">{{ p.operadorNome }}</td>
            <td class="px-4 py-3 text-right font-medium text-[hsl(var(--success))]">{{ formatCurrency(p.valor) }}</td>
          </tr>
          <tr v-if="!paymentsStore.carregando && paymentsStore.ordenados.length === 0">
            <td colspan="6" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Nenhum pagamento registado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:open="dialogAberto" title="Registar Pagamento">
      <p v-if="erro" class="mb-3 rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro }}</p>
      <PaymentForm :a-guardar="aGuardar" @submeter="submeter" @cancelar="dialogAberto = false" />
    </Dialog>
  </div>
</template>
