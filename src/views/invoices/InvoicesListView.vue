<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { FileText, MessageCircle, Plus, Trash2, Zap, XCircle } from 'lucide-vue-next'
import { useInvoicesStore } from '@/stores/invoices'
import { useCustomersStore } from '@/stores/customers'
import { useSettingsStore } from '@/stores/settings'
import { usePermissions } from '@/composables/usePermissions'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import Dialog from '@/components/ui/Dialog.vue'
import GenerateInvoiceDialog from '@/components/invoices/GenerateInvoiceDialog.vue'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency } from '@/utils/currency'
import { ESTADO_FATURA_LABEL, ESTADO_FATURA_TONE, estadoEfetivoFatura } from '@/utils/invoiceStatus'
import { gerarPdfFatura, abrirPdfEmNovaAba } from '@/utils/pdf'
import { abrirWhatsapp } from '@/utils/whatsapp'
import { listarLeiturasPorFaturar } from '@/services/billing'
import type { InvoiceStatus } from '@/types/models'

const invoicesStore = useInvoicesStore()
const customersStore = useCustomersStore()
const settings = useSettingsStore()
const { pode } = usePermissions()

const dialogGerarAberto = ref(false)
const filtroEstado = ref<InvoiceStatus | ''>('')
const aGerarEmMassa = ref(false)
const resultadoMassa = ref<{ sucesso: number; falhas: number } | null>(null)

onMounted(() => {
  invoicesStore.ouvir()
  customersStore.ouvir()
})
onUnmounted(() => {
  invoicesStore.pararDeOuvir()
  customersStore.pararDeOuvir()
})

function nomeCliente(clienteId: string) {
  return customersStore.porId(clienteId)?.nome ?? '—'
}

const filtradas = computed(() => {
  if (!filtroEstado.value) return invoicesStore.ordenadas
  return invoicesStore.ordenadas.filter((f) => estadoEfetivoFatura(f) === filtroEstado.value)
})

const OPCOES_ESTADO = [
  { value: '', label: 'Todos os estados' },
  ...(Object.keys(ESTADO_FATURA_LABEL) as InvoiceStatus[]).map((e) => ({ value: e, label: ESTADO_FATURA_LABEL[e] })),
]

async function gerarEmMassa() {
  aGerarEmMassa.value = true
  resultadoMassa.value = null
  try {
    const leituras = await listarLeiturasPorFaturar()
    const resultado = await invoicesStore.gerarEmMassa(leituras.map((l) => l.id))
    resultadoMassa.value = { sucesso: resultado.sucesso.length, falhas: resultado.falhas.length }
  } finally {
    aGerarEmMassa.value = false
  }
}

async function verPdf(faturaId: string) {
  const fatura = invoicesStore.porId(faturaId)
  if (!fatura) return
  const cliente = customersStore.porId(fatura.clienteId)
  if (!cliente) return
  const pdf = await gerarPdfFatura(fatura, cliente, settings.dados, invoicesStore.itens)
  abrirPdfEmNovaAba(pdf)
}

async function enviarWhatsapp(faturaId: string) {
  const fatura = invoicesStore.porId(faturaId)
  if (!fatura) return
  const cliente = customersStore.porId(fatura.clienteId)
  if (!cliente) return
  if (!cliente.telefone) {
    alert('Este cliente não tem número de telefone registado.')
    return
  }
  // Abre o PDF (para o operador descarregar/guardar) e o WhatsApp com a mensagem já preenchida;
  // o anexo do ficheiro na conversa é feito manualmente, já que não temos um link partilhável.
  abrirPdfEmNovaAba(await gerarPdfFatura(fatura, cliente, settings.dados, invoicesStore.itens))
  const mensagem = `Olá ${cliente.nome}, segue a sua fatura ${fatura.numero} no valor de ${formatCurrency(fatura.total)}, com vencimento em ${formatDate(fatura.dataVencimento)}. Vou anexar o PDF de seguida.`
  abrirWhatsapp(cliente.telefone, mensagem, settings.dados.codigoPaisWhatsapp)
}

async function cancelar(faturaId: string) {
  if (!confirm('Cancelar esta fatura? O saldo do cliente será ajustado.')) return
  try {
    await invoicesStore.cancelar(faturaId)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Não foi possível cancelar a fatura.')
  }
}

async function apagar(faturaId: string) {
  if (!confirm('Apagar definitivamente esta fatura cancelada? Esta ação não pode ser revertida.')) return
  try {
    await invoicesStore.apagar(faturaId)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Não foi possível apagar a fatura.')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Faturação</h1>
      <div class="flex flex-wrap gap-2">
        <Button v-if="pode('invoices', 'create')" variant="outline" :disabled="aGerarEmMassa" @click="gerarEmMassa">
          <Zap :size="16" /> {{ aGerarEmMassa ? 'A gerar…' : 'Gerar em Massa' }}
        </Button>
        <Button v-if="pode('invoices', 'create')" @click="dialogGerarAberto = true">
          <Plus :size="16" /> Gerar Fatura
        </Button>
      </div>
    </div>

    <p v-if="resultadoMassa" class="mb-4 rounded-md bg-[hsl(var(--success))]/10 px-3 py-2 text-sm text-[hsl(var(--success))]">
      {{ resultadoMassa.sucesso }} fatura(s) gerada(s) com sucesso.
      <span v-if="resultadoMassa.falhas > 0">{{ resultadoMassa.falhas }} falharam.</span>
    </p>

    <div class="mb-4 max-w-xs">
      <Select v-model="filtroEstado" :options="OPCOES_ESTADO" />
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Número</th>
            <th class="px-4 py-3 font-medium">Cliente</th>
            <th class="px-4 py-3 font-medium">Emissão</th>
            <th class="px-4 py-3 font-medium">Vencimento</th>
            <th class="px-4 py-3 font-medium text-right">Total</th>
            <th class="px-4 py-3 font-medium text-right">Pago</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="fatura in filtradas" :key="fatura.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="px-4 py-3 font-medium">{{ fatura.numero }}</td>
            <td class="px-4 py-3">{{ nomeCliente(fatura.clienteId) }}</td>
            <td class="px-4 py-3">{{ formatDate(fatura.dataEmissao) }}</td>
            <td class="px-4 py-3">{{ formatDate(fatura.dataVencimento) }}</td>
            <td class="px-4 py-3 text-right font-medium">{{ formatCurrency(fatura.total) }}</td>
            <td class="px-4 py-3 text-right">{{ formatCurrency(fatura.totalPago) }}</td>
            <td class="px-4 py-3">
              <Badge :tone="ESTADO_FATURA_TONE[estadoEfetivoFatura(fatura)]">{{ ESTADO_FATURA_LABEL[estadoEfetivoFatura(fatura)] }}</Badge>
            </td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]" title="Ver PDF" @click="verPdf(fatura.id)">
                  <FileText :size="16" />
                </button>
                <button
                  class="rounded-md p-1.5 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10"
                  title="Enviar por WhatsApp"
                  @click="enviarWhatsapp(fatura.id)"
                >
                  <MessageCircle :size="16" />
                </button>
                <button
                  v-if="pode('invoices', 'delete') && fatura.estado !== 'cancelada' && fatura.totalPago === 0"
                  class="rounded-md p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                  title="Cancelar"
                  @click="cancelar(fatura.id)"
                >
                  <XCircle :size="16" />
                </button>
                <button
                  v-if="pode('invoices', 'delete') && fatura.estado === 'cancelada'"
                  class="rounded-md p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                  title="Apagar definitivamente"
                  @click="apagar(fatura.id)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!invoicesStore.carregando && filtradas.length === 0">
            <td colspan="8" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Nenhuma fatura encontrada.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:open="dialogGerarAberto" title="Gerar Fatura">
      <GenerateInvoiceDialog @gerada="dialogGerarAberto = false" @cancelar="dialogGerarAberto = false" />
    </Dialog>
  </div>
</template>
