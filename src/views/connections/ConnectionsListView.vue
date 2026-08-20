<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, ArrowRight, XCircle } from 'lucide-vue-next'
import { useConnectionsStore } from '@/stores/connections'
import { usePermissions } from '@/composables/usePermissions'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import Dialog from '@/components/ui/Dialog.vue'
import ConnectionForm from '@/components/connections/ConnectionForm.vue'
import InstallConnectionDialog from '@/components/connections/InstallConnectionDialog.vue'
import { formatDate } from '@/utils/dateRange'
import { formatCurrency } from '@/utils/currency'
import type { Connection, ConnectionStatus } from '@/types/models'

const store = useConnectionsStore()
const router = useRouter()
const { pode } = usePermissions()

const dialogNovoAberto = ref(false)
const aGuardar = ref(false)
const pedidoParaInstalar = ref<Connection | null>(null)
const filtroEstado = ref<ConnectionStatus | ''>('')

onMounted(() => store.ouvir())
onUnmounted(() => store.pararDeOuvir())

const SEQUENCIA: ConnectionStatus[] = ['pedido', 'em_analise', 'aprovado', 'aguardando_pagamento', 'em_instalacao', 'instalado']

const ESTADO_LABEL: Record<ConnectionStatus, string> = {
  pedido: 'Pedido',
  em_analise: 'Em Análise',
  aprovado: 'Aprovado',
  aguardando_pagamento: 'Aguardando Pagamento',
  em_instalacao: 'Em Instalação',
  instalado: 'Instalado',
  cancelado: 'Cancelado',
}

const ESTADO_TONE: Record<ConnectionStatus, 'default' | 'success' | 'warning' | 'destructive' | 'muted'> = {
  pedido: 'muted',
  em_analise: 'default',
  aprovado: 'default',
  aguardando_pagamento: 'warning',
  em_instalacao: 'warning',
  instalado: 'success',
  cancelado: 'destructive',
}

const OPCOES_ESTADO = [
  { value: '', label: 'Todos os estados' },
  ...SEQUENCIA.map((e) => ({ value: e, label: ESTADO_LABEL[e] })),
  { value: 'cancelado', label: 'Cancelado' },
]

const filtrados = computed(() => (filtroEstado.value ? store.ordenados.filter((p) => p.estado === filtroEstado.value) : store.ordenados))

function proximoEstado(estadoAtual: ConnectionStatus): ConnectionStatus | null {
  const i = SEQUENCIA.indexOf(estadoAtual)
  if (i === -1 || i === SEQUENCIA.length - 1) return null
  return SEQUENCIA[i + 1]
}

async function submeterNovo(dados: Parameters<typeof store.criar>[0]) {
  aGuardar.value = true
  try {
    await store.criar(dados)
    dialogNovoAberto.value = false
  } finally {
    aGuardar.value = false
  }
}

async function avancar(pedido: Connection) {
  const proximo = proximoEstado(pedido.estado)
  if (!proximo) return
  if (proximo === 'instalado') {
    pedidoParaInstalar.value = pedido
    return
  }
  await store.atualizarEstado(pedido.id, proximo)
}

async function cancelar(pedido: Connection) {
  if (!confirm(`Cancelar o pedido ${pedido.numeroPedido}?`)) return
  await store.atualizarEstado(pedido.id, 'cancelado')
}

function instalacaoConcluida() {
  pedidoParaInstalar.value = null
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Novas Ligações</h1>
      <Button v-if="pode('connections', 'create')" @click="dialogNovoAberto = true">
        <Plus :size="16" /> Novo Pedido
      </Button>
    </div>

    <div class="mb-4 max-w-xs">
      <Select v-model="filtroEstado" :options="OPCOES_ESTADO" />
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Número</th>
            <th class="px-4 py-3 font-medium">Solicitante</th>
            <th class="px-4 py-3 font-medium">Zona</th>
            <th class="px-4 py-3 font-medium">Data</th>
            <th class="px-4 py-3 font-medium text-right">Pendente</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in filtrados" :key="p.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="px-4 py-3 font-medium">{{ p.numeroPedido }}</td>
            <td class="px-4 py-3">{{ p.nomeSolicitante }}</td>
            <td class="px-4 py-3">{{ p.zona }}</td>
            <td class="px-4 py-3">{{ formatDate(p.dataPedido) }}</td>
            <td class="px-4 py-3 text-right">{{ formatCurrency(p.valorPendente) }}</td>
            <td class="px-4 py-3"><Badge :tone="ESTADO_TONE[p.estado]">{{ ESTADO_LABEL[p.estado] }}</Badge></td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button
                  v-if="p.estado === 'instalado' && p.clienteId"
                  class="rounded-md px-2 py-1 text-xs font-medium text-[hsl(var(--primary))] hover:bg-[hsl(var(--accent))]"
                  @click="router.push(`/clientes/${p.clienteId}`)"
                >
                  Ver Cliente
                </button>
                <button
                  v-if="pode('connections', 'edit') && proximoEstado(p.estado)"
                  class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]"
                  :title="`Avançar para ${ESTADO_LABEL[proximoEstado(p.estado)!]}`"
                  @click="avancar(p)"
                >
                  <ArrowRight :size="16" />
                </button>
                <button
                  v-if="pode('connections', 'delete') && p.estado !== 'instalado' && p.estado !== 'cancelado'"
                  class="rounded-md p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                  title="Cancelar pedido"
                  @click="cancelar(p)"
                >
                  <XCircle :size="16" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!store.carregando && filtrados.length === 0">
            <td colspan="7" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Nenhum pedido de ligação encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:open="dialogNovoAberto" title="Novo Pedido de Ligação">
      <ConnectionForm :a-guardar="aGuardar" @submeter="submeterNovo" @cancelar="dialogNovoAberto = false" />
    </Dialog>

    <Dialog :open="!!pedidoParaInstalar" title="Concluir Instalação" @update:open="pedidoParaInstalar = null">
      <InstallConnectionDialog v-if="pedidoParaInstalar" :pedido="pedidoParaInstalar" @concluida="instalacaoConcluida" @cancelar="pedidoParaInstalar = null" />
    </Dialog>
  </div>
</template>
