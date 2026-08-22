<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { Plus, Search, ImageOff, Trash2 } from 'lucide-vue-next'
import { useReadingsStore } from '@/stores/readings'
import { useCustomersStore } from '@/stores/customers'
import { useMetersStore } from '@/stores/meters'
import { usePermissions } from '@/composables/usePermissions'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import ReadingForm from '@/components/readings/ReadingForm.vue'
import { formatDate } from '@/utils/dateRange'
import type { RegistarLeituraParams } from '@/services/meterReadings'

const readingsStore = useReadingsStore()
const customersStore = useCustomersStore()
const metersStore = useMetersStore()
const { pode } = usePermissions()

const pesquisa = ref('')
const dialogAberto = ref(false)
const aGuardar = ref(false)
const erroSubmissao = ref('')
const fotoAmpliada = ref<string | null>(null)

onMounted(() => {
  readingsStore.ouvir()
  customersStore.ouvir()
  metersStore.ouvir()
})
onUnmounted(() => {
  readingsStore.pararDeOuvir()
  customersStore.pararDeOuvir()
  metersStore.pararDeOuvir()
})

function nomeCliente(clienteId: string) {
  return customersStore.porId(clienteId)?.nome ?? '—'
}
function numeroContador(contadorId: string) {
  return metersStore.porId(contadorId)?.numero ?? '—'
}

const ordenadas = computed(() => [...readingsStore.itens].sort((a, b) => b.data - a.data))

const filtradas = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase()
  if (!termo) return ordenadas.value
  return ordenadas.value.filter(
    (r) => nomeCliente(r.clienteId).toLowerCase().includes(termo) || numeroContador(r.contadorId).toLowerCase().includes(termo),
  )
})

async function submeter(dados: RegistarLeituraParams) {
  erroSubmissao.value = ''
  aGuardar.value = true
  try {
    await readingsStore.registar(dados)
    dialogAberto.value = false
  } catch (e) {
    erroSubmissao.value = e instanceof Error ? e.message : 'Não foi possível registar a leitura.'
  } finally {
    aGuardar.value = false
  }
}

async function apagar(leituraId: string) {
  if (!confirm('Apagar esta leitura? Esta ação não pode ser revertida.')) return
  try {
    await readingsStore.remover(leituraId)
  } catch (e) {
    alert(e instanceof Error ? e.message : 'Não foi possível apagar a leitura.')
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Leituras</h1>
      <Button v-if="pode('readings', 'create')" @click="dialogAberto = true; erroSubmissao = ''">
        <Plus :size="16" /> Nova Leitura
      </Button>
    </div>

    <div class="mb-4 relative max-w-sm">
      <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <Input v-model="pesquisa" placeholder="Pesquisar por cliente ou contador…" class="pl-9" />
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Data</th>
            <th class="px-4 py-3 font-medium">Cliente</th>
            <th class="px-4 py-3 font-medium">Contador</th>
            <th class="px-4 py-3 font-medium text-right">Anterior</th>
            <th class="px-4 py-3 font-medium text-right">Atual</th>
            <th class="px-4 py-3 font-medium text-right">Consumo</th>
            <th class="px-4 py-3 font-medium">Leitor</th>
            <th class="px-4 py-3 font-medium">Foto</th>
            <th class="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="leitura in filtradas" :key="leitura.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="px-4 py-3">{{ formatDate(leitura.data) }}</td>
            <td class="px-4 py-3">{{ nomeCliente(leitura.clienteId) }}</td>
            <td class="px-4 py-3">{{ numeroContador(leitura.contadorId) }}</td>
            <td class="px-4 py-3 text-right">{{ leitura.leituraAnterior.toFixed(2) }}</td>
            <td class="px-4 py-3 text-right">{{ leitura.leituraAtual.toFixed(2) }}</td>
            <td class="px-4 py-3 text-right font-medium">
              {{ leitura.consumo.toFixed(2) }} m³
              <Badge v-if="leitura.corrigida" tone="warning" class="ml-1">Corrigida</Badge>
            </td>
            <td class="px-4 py-3">{{ leitura.leitorNome }}</td>
            <td class="px-4 py-3">
              <img
                v-if="leitura.fotoUrl"
                :src="leitura.fotoUrl"
                class="h-8 w-8 cursor-pointer rounded object-cover"
                @click="fotoAmpliada = leitura.fotoUrl!"
              />
              <ImageOff v-else :size="16" class="text-[hsl(var(--muted-foreground))]" />
            </td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="pode('readings', 'delete')"
                class="rounded-md p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                title="Apagar leitura"
                @click="apagar(leitura.id)"
              >
                <Trash2 :size="16" />
              </button>
            </td>
          </tr>
          <tr v-if="!readingsStore.carregando && filtradas.length === 0">
            <td colspan="9" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Nenhuma leitura registada.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:open="dialogAberto" title="Nova Leitura">
      <p v-if="erroSubmissao" class="mb-3 rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">
        {{ erroSubmissao }}
      </p>
      <ReadingForm :a-guardar="aGuardar" @submeter="submeter" @cancelar="dialogAberto = false" />
    </Dialog>

    <div v-if="fotoAmpliada" class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6" @click="fotoAmpliada = null">
      <img :src="fotoAmpliada" class="max-h-full max-w-full rounded-lg" />
    </div>
  </div>
</template>
