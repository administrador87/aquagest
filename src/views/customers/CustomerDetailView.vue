<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Pencil, Plus, ImageOff, FileText, MessageCircle, Trash2, XCircle } from 'lucide-vue-next'
import { useCustomersStore } from '@/stores/customers'
import { useMetersStore } from '@/stores/meters'
import { useReadingsStore } from '@/stores/readings'
import { useInvoicesStore } from '@/stores/invoices'
import { usePaymentsStore } from '@/stores/payments'
import { useReceiptsStore } from '@/stores/receipts'
import { useFinancialTransactionsStore } from '@/stores/financialTransactions'
import { useSettingsStore } from '@/stores/settings'
import { usePermissions } from '@/composables/usePermissions'
import Card from '@/components/ui/Card.vue'
import Badge from '@/components/ui/Badge.vue'
import Button from '@/components/ui/Button.vue'
import Dialog from '@/components/ui/Dialog.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import MeterForm from '@/components/meters/MeterForm.vue'
import ReadingForm from '@/components/readings/ReadingForm.vue'
import GenerateInvoiceDialog from '@/components/invoices/GenerateInvoiceDialog.vue'
import PaymentForm from '@/components/payments/PaymentForm.vue'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency } from '@/utils/currency'
import { cn } from '@/utils/cn'
import { ESTADO_FATURA_LABEL, ESTADO_FATURA_TONE, estadoEfetivoFatura } from '@/utils/invoiceStatus'
import { gerarPdfFatura, gerarPdfRecibo, abrirPdfEmNovaAba } from '@/utils/pdf'
import { abrirWhatsapp } from '@/utils/whatsapp'
import type { Meter, PaymentMethod } from '@/types/models'
import type { RegistarLeituraParams } from '@/services/meterReadings'

const route = useRoute()
const router = useRouter()
const customersStore = useCustomersStore()
const metersStore = useMetersStore()
const readingsStore = useReadingsStore()
const invoicesStore = useInvoicesStore()
const paymentsStore = usePaymentsStore()
const receiptsStore = useReceiptsStore()
const financialTransactionsStore = useFinancialTransactionsStore()
const settings = useSettingsStore()
const { pode } = usePermissions()

const clienteId = computed(() => route.params.id as string)
const cliente = computed(() => customersStore.porId(clienteId.value))

const abaAtiva = ref<'dados' | 'contador' | 'leituras' | 'faturas' | 'pagamentos' | 'recibos' | 'financeiro'>('dados')
const ABAS = [
  { id: 'dados', label: 'Dados' },
  { id: 'contador', label: 'Contador' },
  { id: 'leituras', label: 'Leituras' },
  { id: 'faturas', label: 'Faturas' },
  { id: 'pagamentos', label: 'Pagamentos' },
  { id: 'recibos', label: 'Recibos' },
  { id: 'financeiro', label: 'Financeiro' },
] as const

onMounted(() => {
  customersStore.ouvir()
  metersStore.ouvir()
  readingsStore.ouvir()
  invoicesStore.ouvir()
  paymentsStore.ouvir()
  receiptsStore.ouvir()
  financialTransactionsStore.ouvirParaCliente(clienteId.value)
  if (!settings.carregado) settings.carregar()
})
onUnmounted(() => {
  customersStore.pararDeOuvir()
  metersStore.pararDeOuvir()
  readingsStore.pararDeOuvir()
  invoicesStore.pararDeOuvir()
  paymentsStore.pararDeOuvir()
  receiptsStore.pararDeOuvir()
  financialTransactionsStore.pararDeOuvirCliente(clienteId.value)
})

const contadores = computed(() => metersStore.porCliente(clienteId.value))
const contadorAtivo = computed(() => metersStore.ativoPorCliente(clienteId.value))
const leiturasCliente = computed(() => readingsStore.porCliente(clienteId.value))
const faturasCliente = computed(() => invoicesStore.porCliente(clienteId.value))
const pagamentosCliente = computed(() => paymentsStore.porCliente(clienteId.value))
const recibosCliente = computed(() => receiptsStore.porCliente(clienteId.value))
const extratoCliente = computed(() => financialTransactionsStore.extratoDoCliente(clienteId.value))
const faturasVencidasCliente = computed(
  () => faturasCliente.value.filter((f) => estadoEfetivoFatura(f) === 'vencida').length,
)

const METODO_LABEL: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  transferencia: 'Transferência',
  mpesa: 'M-Pesa',
  emola: 'E-Mola',
  outro: 'Outro',
}

// Gerar fatura
const dialogFaturaAberto = ref(false)
function faturaGerada() {
  dialogFaturaAberto.value = false
}
function verPdfFatura(faturaId: string) {
  const fatura = faturasCliente.value.find((f) => f.id === faturaId)
  if (!fatura || !cliente.value) return
  abrirPdfEmNovaAba(gerarPdfFatura(fatura, cliente.value, settings.dados))
}
function enviarWhatsappFatura(faturaId: string) {
  const fatura = faturasCliente.value.find((f) => f.id === faturaId)
  if (!fatura || !cliente.value) return
  if (!cliente.value.telefone) {
    alert('Este cliente não tem número de telefone registado.')
    return
  }
  abrirPdfEmNovaAba(gerarPdfFatura(fatura, cliente.value, settings.dados))
  const mensagem = `Olá ${cliente.value.nome}, segue a sua fatura ${fatura.numero} no valor de ${formatCurrency(fatura.total)}, com vencimento em ${formatDate(fatura.dataVencimento)}. Vou anexar o PDF de seguida.`
  abrirWhatsapp(cliente.value.telefone, mensagem, settings.dados.codigoPaisWhatsapp)
}
async function cancelarFatura(faturaId: string) {
  if (!confirm('Cancelar esta fatura? O saldo do cliente será ajustado.')) return
  try {
    await invoicesStore.cancelar(faturaId)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Não foi possível cancelar a fatura.')
  }
}

async function apagarFatura(faturaId: string) {
  if (!confirm('Apagar definitivamente esta fatura cancelada? Esta ação não pode ser revertida.')) return
  try {
    await invoicesStore.apagar(faturaId)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Não foi possível apagar a fatura.')
  }
}

// Registar pagamento
const dialogPagamentoAberto = ref(false)
const aGuardarPagamento = ref(false)
const erroPagamento = ref('')
async function submeterPagamento(dados: { clienteId: string; valor: number; metodo: PaymentMethod; referencia?: string; observacoes?: string }) {
  erroPagamento.value = ''
  aGuardarPagamento.value = true
  try {
    await paymentsStore.registar(dados)
    dialogPagamentoAberto.value = false
  } catch (e) {
    erroPagamento.value = e instanceof Error ? e.message : 'Não foi possível registar o pagamento.'
  } finally {
    aGuardarPagamento.value = false
  }
}

function verPdfRecibo(reciboId: string) {
  const recibo = recibosCliente.value.find((r) => r.id === reciboId)
  if (!recibo || !cliente.value) return
  abrirPdfEmNovaAba(gerarPdfRecibo(recibo, cliente.value, settings.dados, invoicesStore.itens))
}
function enviarWhatsappRecibo(reciboId: string) {
  const recibo = recibosCliente.value.find((r) => r.id === reciboId)
  if (!recibo || !cliente.value) return
  if (!cliente.value.telefone) {
    alert('Este cliente não tem número de telefone registado.')
    return
  }
  abrirPdfEmNovaAba(gerarPdfRecibo(recibo, cliente.value, settings.dados, invoicesStore.itens))
  const mensagem = `Olá ${cliente.value.nome}, obrigado pelo pagamento. Segue o recibo ${recibo.numero} no valor de ${formatCurrency(recibo.valorRecebido)}. Vou anexar o PDF de seguida.`
  abrirWhatsapp(cliente.value.telefone, mensagem, settings.dados.codigoPaisWhatsapp)
}

// Edição de dados do cliente
const dialogClienteAberto = ref(false)
const aGuardarCliente = ref(false)
async function submeterCliente(dados: Record<string, unknown>) {
  aGuardarCliente.value = true
  try {
    await customersStore.atualizar(clienteId.value, dados)
    dialogClienteAberto.value = false
  } finally {
    aGuardarCliente.value = false
  }
}

// Novo contador para este cliente
const dialogContadorAberto = ref(false)
const aGuardarContador = ref(false)
async function submeterContador(dados: Record<string, unknown>) {
  aGuardarContador.value = true
  try {
    await metersStore.criar({ ...(dados as Omit<Meter, 'id' | 'clienteId' | 'criadoEm' | 'atualizadoEm'>), clienteId: clienteId.value })
    dialogContadorAberto.value = false
  } finally {
    aGuardarContador.value = false
  }
}

// Nova leitura para este cliente
const dialogLeituraAberto = ref(false)
const aGuardarLeitura = ref(false)
const erroLeitura = ref('')
async function submeterLeitura(dados: RegistarLeituraParams) {
  erroLeitura.value = ''
  aGuardarLeitura.value = true
  try {
    await readingsStore.registar(dados)
    dialogLeituraAberto.value = false
  } catch (e) {
    erroLeitura.value = e instanceof Error ? e.message : 'Não foi possível registar a leitura.'
  } finally {
    aGuardarLeitura.value = false
  }
}

const ESTADO_TONE: Record<string, 'success' | 'muted' | 'destructive'> = {
  ativo: 'success',
  substituido: 'muted',
  avariado: 'destructive',
  removido: 'muted',
}
</script>

<template>
  <div v-if="cliente">
    <button class="mb-4 flex items-center gap-1 text-sm text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]" @click="router.push('/clientes')">
      <ArrowLeft :size="16" /> Voltar a Clientes
    </button>

    <div class="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div>
        <div class="flex items-center gap-2">
          <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">{{ cliente.nome }}</h1>
          <Badge :tone="cliente.estado === 'ativo' ? 'success' : 'muted'">{{ cliente.estado === 'ativo' ? 'Ativo' : 'Inativo' }}</Badge>
        </div>
        <p class="text-sm text-[hsl(var(--muted-foreground))]">{{ cliente.codigo }} · {{ cliente.zona }} · {{ cliente.bairro }}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-[hsl(var(--muted-foreground))]">Saldo atual</p>
        <p :class="cn('text-xl font-bold', cliente.saldoAtual > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]')">
          {{ formatCurrency(cliente.saldoAtual) }}
        </p>
      </div>
    </div>

    <div class="mb-4 flex gap-1 overflow-x-auto border-b border-[hsl(var(--border))]">
      <button
        v-for="aba in ABAS"
        :key="aba.id"
        :class="
          cn(
            'whitespace-nowrap border-b-2 px-4 py-2 text-sm font-medium',
            abaAtiva === aba.id ? 'border-[hsl(var(--primary))] text-[hsl(var(--primary))]' : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]',
          )
        "
        @click="abaAtiva = aba.id"
      >
        {{ aba.label }}
      </button>
    </div>

    <Card v-if="abaAtiva === 'dados'" class="p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Dados Pessoais</h2>
        <Button v-if="pode('customers', 'edit')" size="sm" variant="outline" @click="dialogClienteAberto = true">
          <Pencil :size="14" /> Editar
        </Button>
      </div>
      <dl class="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
        <div><dt class="text-[hsl(var(--muted-foreground))]">Documento</dt><dd class="font-medium">{{ cliente.documento }}</dd></div>
        <div><dt class="text-[hsl(var(--muted-foreground))]">Telefone</dt><dd class="font-medium">{{ cliente.telefone }}</dd></div>
        <div><dt class="text-[hsl(var(--muted-foreground))]">Email</dt><dd class="font-medium">{{ cliente.email || '—' }}</dd></div>
        <div><dt class="text-[hsl(var(--muted-foreground))]">Tipo de cliente</dt><dd class="font-medium capitalize">{{ cliente.tipo }}</dd></div>
        <div class="sm:col-span-2"><dt class="text-[hsl(var(--muted-foreground))]">Endereço</dt><dd class="font-medium">{{ cliente.endereco }}</dd></div>
        <div><dt class="text-[hsl(var(--muted-foreground))]">Data de cadastro</dt><dd class="font-medium">{{ formatDate(cliente.dataCadastro) }}</dd></div>
        <div v-if="cliente.observacoes" class="sm:col-span-2"><dt class="text-[hsl(var(--muted-foreground))]">Observações</dt><dd class="font-medium">{{ cliente.observacoes }}</dd></div>
      </dl>
    </Card>

    <Card v-else-if="abaAtiva === 'contador'" class="p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Contadores</h2>
        <Button v-if="pode('meters', 'create')" size="sm" @click="dialogContadorAberto = true">
          <Plus :size="14" /> Novo Contador
        </Button>
      </div>
      <p v-if="contadores.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Nenhum contador registado.</p>
      <div v-else class="flex flex-col gap-3">
        <div v-for="m in contadores" :key="m.id" class="rounded-md border border-[hsl(var(--border))] p-3">
          <div class="mb-1 flex items-center justify-between">
            <p class="font-medium">{{ m.numero }} <span class="text-[hsl(var(--muted-foreground))]">({{ m.marca }} {{ m.modelo }})</span></p>
            <Badge :tone="ESTADO_TONE[m.estado]">{{ m.estado }}</Badge>
          </div>
          <p class="text-xs text-[hsl(var(--muted-foreground))]">
            Série {{ m.numeroSerie }} · Instalado em {{ formatDate(m.dataInstalacao) }} · Leitura inicial {{ m.leituraInicial }} m³
          </p>
        </div>
      </div>
    </Card>

    <Card v-else-if="abaAtiva === 'leituras'" class="p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Leituras</h2>
        <Button v-if="pode('readings', 'create') && contadorAtivo" size="sm" @click="dialogLeituraAberto = true; erroLeitura = ''">
          <Plus :size="14" /> Nova Leitura
        </Button>
      </div>
      <p v-if="!contadorAtivo" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Registe um contador ativo para poder lançar leituras.</p>
      <p v-else-if="leiturasCliente.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Nenhuma leitura registada.</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="py-2 font-medium">Data</th>
            <th class="py-2 font-medium text-right">Anterior</th>
            <th class="py-2 font-medium text-right">Atual</th>
            <th class="py-2 font-medium text-right">Consumo</th>
            <th class="py-2 font-medium">Leitor</th>
            <th class="py-2 font-medium">Foto</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in leiturasCliente" :key="r.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="py-2">{{ formatDate(r.data) }}</td>
            <td class="py-2 text-right">{{ r.leituraAnterior.toFixed(2) }}</td>
            <td class="py-2 text-right">{{ r.leituraAtual.toFixed(2) }}</td>
            <td class="py-2 text-right font-medium">{{ r.consumo.toFixed(2) }} m³</td>
            <td class="py-2">{{ r.leitorNome }}</td>
            <td class="py-2">
              <img v-if="r.fotoUrl" :src="r.fotoUrl" class="h-7 w-7 rounded object-cover" />
              <ImageOff v-else :size="14" class="text-[hsl(var(--muted-foreground))]" />
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <Card v-else-if="abaAtiva === 'faturas'" class="p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Faturas</h2>
        <Button v-if="pode('invoices', 'create')" size="sm" @click="dialogFaturaAberto = true">
          <Plus :size="14" /> Gerar Fatura
        </Button>
      </div>
      <p v-if="faturasCliente.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Nenhuma fatura emitida.</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="py-2 font-medium">Número</th>
            <th class="py-2 font-medium">Emissão</th>
            <th class="py-2 font-medium">Vencimento</th>
            <th class="py-2 font-medium text-right">Total</th>
            <th class="py-2 font-medium text-right">Pago</th>
            <th class="py-2 font-medium">Estado</th>
            <th class="py-2 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="f in faturasCliente" :key="f.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="py-2 font-medium">{{ f.numero }}</td>
            <td class="py-2">{{ formatDate(f.dataEmissao) }}</td>
            <td class="py-2">{{ formatDate(f.dataVencimento) }}</td>
            <td class="py-2 text-right font-medium">{{ formatCurrency(f.total) }}</td>
            <td class="py-2 text-right">{{ formatCurrency(f.totalPago) }}</td>
            <td class="py-2"><Badge :tone="ESTADO_FATURA_TONE[estadoEfetivoFatura(f)]">{{ ESTADO_FATURA_LABEL[estadoEfetivoFatura(f)] }}</Badge></td>
            <td class="py-2">
              <div class="flex justify-end gap-1">
                <button class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]" title="Ver PDF" @click="verPdfFatura(f.id)"><FileText :size="14" /></button>
                <button
                  class="rounded-md p-1.5 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10"
                  title="Enviar por WhatsApp"
                  @click="enviarWhatsappFatura(f.id)"
                >
                  <MessageCircle :size="14" />
                </button>
                <button
                  v-if="pode('invoices', 'delete') && f.estado !== 'cancelada' && f.totalPago === 0"
                  class="rounded-md p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                  title="Cancelar"
                  @click="cancelarFatura(f.id)"
                >
                  <XCircle :size="14" />
                </button>
                <button
                  v-if="pode('invoices', 'delete') && f.estado === 'cancelada'"
                  class="rounded-md p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                  title="Apagar definitivamente"
                  @click="apagarFatura(f.id)"
                >
                  <Trash2 :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <Card v-else-if="abaAtiva === 'pagamentos'" class="p-5">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-sm font-semibold">Pagamentos</h2>
        <Button v-if="pode('payments', 'create')" size="sm" @click="dialogPagamentoAberto = true; erroPagamento = ''">
          <Plus :size="14" /> Registar Pagamento
        </Button>
      </div>
      <p v-if="pagamentosCliente.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Nenhum pagamento registado.</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="py-2 font-medium">Data</th>
            <th class="py-2 font-medium">Método</th>
            <th class="py-2 font-medium">Referência</th>
            <th class="py-2 font-medium">Operador</th>
            <th class="py-2 font-medium text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in pagamentosCliente" :key="p.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="py-2">{{ formatDate(p.data) }}</td>
            <td class="py-2">{{ METODO_LABEL[p.metodo] }}</td>
            <td class="py-2 text-[hsl(var(--muted-foreground))]">{{ p.referencia || '—' }}</td>
            <td class="py-2">{{ p.operadorNome }}</td>
            <td class="py-2 text-right font-medium text-[hsl(var(--success))]">{{ formatCurrency(p.valor) }}</td>
          </tr>
        </tbody>
      </table>
    </Card>

    <Card v-else-if="abaAtiva === 'recibos'" class="p-5">
      <h2 class="mb-4 text-sm font-semibold">Recibos</h2>
      <p v-if="recibosCliente.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Nenhum recibo emitido.</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="py-2 font-medium">Número</th>
            <th class="py-2 font-medium">Data</th>
            <th class="py-2 font-medium text-right">Valor</th>
            <th class="py-2 font-medium text-right">Saldo Restante</th>
            <th class="py-2 font-medium text-right">PDF</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in recibosCliente" :key="r.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="py-2 font-medium">{{ r.numero }}</td>
            <td class="py-2">{{ formatDate(r.data) }}</td>
            <td class="py-2 text-right font-medium">{{ formatCurrency(r.valorRecebido) }}</td>
            <td class="py-2 text-right">{{ formatCurrency(r.saldoRestante) }}</td>
            <td class="py-2 text-right">
              <div class="flex justify-end gap-1">
                <button class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]" title="Ver PDF" @click="verPdfRecibo(r.id)"><FileText :size="14" /></button>
                <button
                  class="rounded-md p-1.5 text-[hsl(var(--success))] hover:bg-[hsl(var(--success))]/10"
                  title="Enviar por WhatsApp"
                  @click="enviarWhatsappRecibo(r.id)"
                >
                  <MessageCircle :size="14" />
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </Card>

    <Card v-else-if="abaAtiva === 'financeiro'" class="p-5">
      <h2 class="mb-4 text-sm font-semibold">Posição Financeira</h2>
      <dl class="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div><dt class="text-[hsl(var(--muted-foreground))]">Saldo atual</dt><dd class="text-lg font-bold" :class="cliente.saldoAtual > 0 ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'">{{ formatCurrency(cliente.saldoAtual) }}</dd></div>
        <div><dt class="text-[hsl(var(--muted-foreground))]">Faturas vencidas</dt><dd class="text-lg font-bold" :class="faturasVencidasCliente > 0 ? 'text-[hsl(var(--destructive))]' : ''">{{ faturasVencidasCliente }}</dd></div>
        <div><dt class="text-[hsl(var(--muted-foreground))]">Último pagamento</dt><dd class="font-medium">{{ pagamentosCliente[0] ? formatDate(pagamentosCliente[0].data) : '—' }}</dd></div>
        <div><dt class="text-[hsl(var(--muted-foreground))]">Última leitura</dt><dd class="font-medium">{{ leiturasCliente[0] ? formatDate(leiturasCliente[0].data) : '—' }}</dd></div>
      </dl>

      <h3 class="mb-3 mt-6 text-sm font-semibold">Extrato Financeiro</h3>
      <p v-if="extratoCliente.length === 0" class="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">Sem movimentos financeiros.</p>
      <table v-else class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="py-2 font-medium">Data</th>
            <th class="py-2 font-medium">Descrição</th>
            <th class="py-2 font-medium text-right">Valor</th>
            <th class="py-2 font-medium text-right">Saldo</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="mov in extratoCliente" :key="mov.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="py-2">{{ formatDate(mov.data) }}</td>
            <td class="py-2">{{ mov.descricao }}</td>
            <td class="py-2 text-right font-medium" :class="mov.tipo === 'debito' ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--success))]'">
              {{ mov.tipo === 'debito' ? '+' : '-' }}{{ formatCurrency(mov.valor) }}
            </td>
            <td class="py-2 text-right">{{ formatCurrency(mov.saldoAposMovimento) }}</td>
          </tr>
        </tbody>
      </table>
    </Card>

    <Dialog v-model:open="dialogClienteAberto" title="Editar Cliente">
      <CustomerForm :inicial="cliente" :a-guardar="aGuardarCliente" @submeter="submeterCliente" @cancelar="dialogClienteAberto = false" />
    </Dialog>

    <Dialog v-model:open="dialogContadorAberto" title="Novo Contador">
      <MeterForm :a-guardar="aGuardarContador" @submeter="submeterContador" @cancelar="dialogContadorAberto = false" />
    </Dialog>

    <Dialog v-model:open="dialogLeituraAberto" title="Nova Leitura">
      <p v-if="erroLeitura" class="mb-3 rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erroLeitura }}</p>
      <ReadingForm :cliente-id-fixo="clienteId" :a-guardar="aGuardarLeitura" @submeter="submeterLeitura" @cancelar="dialogLeituraAberto = false" />
    </Dialog>

    <Dialog v-model:open="dialogFaturaAberto" title="Gerar Fatura">
      <GenerateInvoiceDialog :cliente-id-fixo="clienteId" @gerada="faturaGerada" @cancelar="dialogFaturaAberto = false" />
    </Dialog>

    <Dialog v-model:open="dialogPagamentoAberto" title="Registar Pagamento">
      <p v-if="erroPagamento" class="mb-3 rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erroPagamento }}</p>
      <PaymentForm :cliente-id-fixo="clienteId" :a-guardar="aGuardarPagamento" @submeter="submeterPagamento" @cancelar="dialogPagamentoAberto = false" />
    </Dialog>
  </div>

  <div v-else class="py-24 text-center text-sm text-[hsl(var(--muted-foreground))]">Cliente não encontrado.</div>
</template>
