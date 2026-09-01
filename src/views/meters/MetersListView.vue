<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Plus, Search, Pencil, RefreshCcw, Droplets } from 'lucide-vue-next'
import { useMetersStore } from '@/stores/meters'
import { useCustomersStore } from '@/stores/customers'
import { usePermissions } from '@/composables/usePermissions'
import { tipoContador } from '@/utils/meterKind'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import MeterForm from '@/components/meters/MeterForm.vue'
import { formatDate } from '@/utils/dateRange'
import type { Meter } from '@/types/models'

const metersStore = useMetersStore()
const customersStore = useCustomersStore()
const { pode } = usePermissions()

const pesquisa = ref('')
const dialogAberto = ref(false)
const contadorEmEdicao = ref<Meter | null>(null)
const contadorATrocar = ref<Meter | null>(null)
const clienteSelecionado = ref('')
const eFonte = ref(false)
const aGuardar = ref(false)

onMounted(() => {
  metersStore.ouvir()
  customersStore.ouvir()
})
onUnmounted(() => {
  metersStore.pararDeOuvir()
  customersStore.pararDeOuvir()
})

const opcoesClientes = computed(() =>
  customersStore.itens.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nome}` })),
)

function nomeCliente(clienteId?: string) {
  if (!clienteId) return '—'
  return customersStore.porId(clienteId)?.nome ?? '—'
}

function clienteOuFonte(contador: Meter) {
  return tipoContador(contador) === 'fonte' ? 'Fonte (geral)' : nomeCliente(contador.clienteId)
}

const filtrados = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase()
  if (!termo) return metersStore.itens
  return metersStore.itens.filter(
    (m) =>
      m.numero.toLowerCase().includes(termo) ||
      m.numeroSerie.toLowerCase().includes(termo) ||
      clienteOuFonte(m).toLowerCase().includes(termo),
  )
})

const ESTADO_TONE: Record<Meter['estado'], 'success' | 'muted' | 'destructive' | 'warning'> = {
  ativo: 'success',
  substituido: 'muted',
  avariado: 'destructive',
  removido: 'muted',
}
const ESTADO_LABEL: Record<Meter['estado'], string> = {
  ativo: 'Ativo',
  substituido: 'Substituído',
  avariado: 'Avariado',
  removido: 'Removido',
}

function abrirNovo() {
  contadorEmEdicao.value = null
  contadorATrocar.value = null
  clienteSelecionado.value = ''
  eFonte.value = false
  dialogAberto.value = true
}

function abrirNovaFonte() {
  contadorEmEdicao.value = null
  contadorATrocar.value = null
  clienteSelecionado.value = ''
  eFonte.value = true
  dialogAberto.value = true
}

function abrirEdicao(contador: Meter) {
  contadorEmEdicao.value = contador
  contadorATrocar.value = null
  clienteSelecionado.value = contador.clienteId ?? ''
  eFonte.value = tipoContador(contador) === 'fonte'
  dialogAberto.value = true
}

function abrirTroca(contador: Meter) {
  contadorEmEdicao.value = null
  contadorATrocar.value = contador
  clienteSelecionado.value = contador.clienteId ?? ''
  eFonte.value = tipoContador(contador) === 'fonte'
  dialogAberto.value = true
}

async function submeter(dados: Record<string, unknown>) {
  if (!eFonte.value && !clienteSelecionado.value) {
    alert('Selecione o cliente do contador.')
    return
  }
  aGuardar.value = true
  try {
    const clienteId = eFonte.value ? undefined : clienteSelecionado.value
    const tipo = eFonte.value ? 'fonte' : 'cliente'
    if (contadorATrocar.value) {
      await metersStore.trocar(contadorATrocar.value.id, {
        ...(dados as Omit<Meter, 'id' | 'substitui' | 'substituidoPor' | 'estado' | 'criadoEm' | 'atualizadoEm'>),
        clienteId,
        tipo,
      })
    } else if (contadorEmEdicao.value) {
      await metersStore.atualizar(contadorEmEdicao.value.id, { ...dados, clienteId, tipo })
    } else {
      await metersStore.criar({
        ...(dados as Omit<Meter, 'id' | 'clienteId' | 'tipo' | 'criadoEm' | 'atualizadoEm'>),
        clienteId,
        tipo,
      })
    }
    dialogAberto.value = false
  } finally {
    aGuardar.value = false
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Contadores</h1>
      <div v-if="pode('meters', 'create')" class="flex flex-wrap gap-2">
        <Button variant="outline" @click="abrirNovaFonte">
          <Droplets :size="16" /> Novo Contador da Fonte
        </Button>
        <Button @click="abrirNovo">
          <Plus :size="16" /> Novo Contador
        </Button>
      </div>
    </div>

    <div class="mb-4 relative max-w-sm">
      <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <Input v-model="pesquisa" placeholder="Pesquisar por número, série, cliente…" class="pl-9" />
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Número</th>
            <th class="px-4 py-3 font-medium">Cliente</th>
            <th class="px-4 py-3 font-medium">Marca/Modelo</th>
            <th class="px-4 py-3 font-medium">Instalação</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="contador in filtrados" :key="contador.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="px-4 py-3 font-medium">{{ contador.numero }}</td>
            <td class="px-4 py-3">
              <span v-if="tipoContador(contador) === 'fonte'" class="inline-flex items-center gap-1 text-sky-700">
                <Droplets :size="14" /> Fonte (geral)
              </span>
              <span v-else>{{ nomeCliente(contador.clienteId) }}</span>
            </td>
            <td class="px-4 py-3">{{ contador.marca }} {{ contador.modelo }}</td>
            <td class="px-4 py-3 text-[hsl(var(--muted-foreground))]">{{ formatDate(contador.dataInstalacao) }}</td>
            <td class="px-4 py-3"><Badge :tone="ESTADO_TONE[contador.estado]">{{ ESTADO_LABEL[contador.estado] }}</Badge></td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button
                  v-if="pode('meters', 'edit')"
                  class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]"
                  title="Editar"
                  @click="abrirEdicao(contador)"
                >
                  <Pencil :size="16" />
                </button>
                <button
                  v-if="pode('meters', 'edit') && contador.estado === 'ativo'"
                  class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]"
                  title="Trocar contador"
                  @click="abrirTroca(contador)"
                >
                  <RefreshCcw :size="16" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!metersStore.carregando && filtrados.length === 0">
            <td colspan="6" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Nenhum contador encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog
      v-model:open="dialogAberto"
      :title="(contadorATrocar ? 'Trocar Contador' : contadorEmEdicao ? 'Editar Contador' : eFonte ? 'Novo Contador da Fonte' : 'Novo Contador')"
    >
      <p v-if="eFonte" class="mb-4 text-xs text-[hsl(var(--muted-foreground))]">
        Contador geral instalado à saída da fonte/reservatório, sem cliente associado — usado para medir o volume
        total distribuído e comparar com o consumo faturado.
      </p>
      <div v-else class="mb-4">
        <label class="mb-1 block text-sm font-medium">Cliente</label>
        <Select v-model="clienteSelecionado" :options="opcoesClientes" placeholder="Selecione o cliente" :disabled="!!contadorATrocar" />
        <p v-if="contadorATrocar" class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
          O contador antigo ({{ contadorATrocar.numero }}) será marcado como substituído, preservando o histórico.
        </p>
      </div>
      <MeterForm
        :key="contadorEmEdicao?.id ?? contadorATrocar?.id ?? 'novo'"
        :inicial="contadorATrocar ? undefined : (contadorEmEdicao ?? undefined)"
        :a-guardar="aGuardar"
        @submeter="submeter"
        @cancelar="dialogAberto = false"
      />
    </Dialog>
  </div>
</template>
