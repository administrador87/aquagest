<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { Plus, Search, Pencil, Trash2 } from 'lucide-vue-next'
import { useCustomersStore } from '@/stores/customers'
import { usePermissions } from '@/composables/usePermissions'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Badge from '@/components/ui/Badge.vue'
import Dialog from '@/components/ui/Dialog.vue'
import CustomerForm from '@/components/customers/CustomerForm.vue'
import { formatDate } from '@/utils/dateRange'
import type { Customer } from '@/types/models'

const store = useCustomersStore()
const router = useRouter()
const { pode } = usePermissions()

const pesquisa = ref('')
const dialogAberto = ref(false)
const clienteEmEdicao = ref<Customer | null>(null)
const aGuardar = ref(false)

onMounted(() => store.ouvir())
onUnmounted(() => store.pararDeOuvir())

const filtrados = computed(() => {
  const termo = pesquisa.value.trim().toLowerCase()
  if (!termo) return store.itens
  return store.itens.filter(
    (c) =>
      c.nome.toLowerCase().includes(termo) ||
      c.codigo.toLowerCase().includes(termo) ||
      c.documento.toLowerCase().includes(termo) ||
      c.bairro.toLowerCase().includes(termo) ||
      c.zona.toLowerCase().includes(termo),
  )
})

function abrirNovo() {
  clienteEmEdicao.value = null
  dialogAberto.value = true
}

function abrirEdicao(cliente: Customer, evento: Event) {
  evento.stopPropagation()
  clienteEmEdicao.value = cliente
  dialogAberto.value = true
}

async function submeter(dados: Record<string, unknown>) {
  aGuardar.value = true
  try {
    if (clienteEmEdicao.value) {
      await store.atualizar(clienteEmEdicao.value.id, dados)
    } else {
      await store.criar(dados as Omit<Customer, 'id' | 'criadoEm' | 'atualizadoEm' | 'codigo' | 'saldoAtual'>)
    }
    dialogAberto.value = false
  } finally {
    aGuardar.value = false
  }
}

async function remover(cliente: Customer, evento: Event) {
  evento.stopPropagation()
  if (confirm(`Eliminar o cliente "${cliente.nome}"? Esta ação não pode ser revertida.`)) {
    await store.remover(cliente.id)
  }
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Clientes</h1>
      <Button v-if="pode('customers', 'create')" @click="abrirNovo">
        <Plus :size="16" /> Novo Cliente
      </Button>
    </div>

    <div class="mb-4 relative max-w-sm">
      <Search :size="16" class="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" />
      <Input v-model="pesquisa" placeholder="Pesquisar por nome, código, documento, bairro…" class="pl-9" />
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Código</th>
            <th class="px-4 py-3 font-medium">Nome</th>
            <th class="px-4 py-3 font-medium">Telefone</th>
            <th class="px-4 py-3 font-medium">Zona</th>
            <th class="px-4 py-3 font-medium">Tipo</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium">Cadastro</th>
            <th class="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="cliente in filtrados"
            :key="cliente.id"
            class="cursor-pointer border-b border-[hsl(var(--border))] last:border-0 hover:bg-[hsl(var(--accent))]"
            @click="router.push(`/clientes/${cliente.id}`)"
          >
            <td class="px-4 py-3 font-medium">{{ cliente.codigo }}</td>
            <td class="px-4 py-3">{{ cliente.nome }}</td>
            <td class="px-4 py-3">{{ cliente.telefone }}</td>
            <td class="px-4 py-3">{{ cliente.zona }}</td>
            <td class="px-4 py-3 capitalize">{{ cliente.tipo }}</td>
            <td class="px-4 py-3">
              <Badge :tone="cliente.estado === 'ativo' ? 'success' : 'muted'">{{ cliente.estado === 'ativo' ? 'Ativo' : 'Inativo' }}</Badge>
            </td>
            <td class="px-4 py-3 text-[hsl(var(--muted-foreground))]">{{ formatDate(cliente.dataCadastro) }}</td>
            <td class="px-4 py-3">
              <div class="flex justify-end gap-1">
                <button
                  v-if="pode('customers', 'edit')"
                  class="rounded-md p-1.5 hover:bg-[hsl(var(--accent))]"
                  @click="abrirEdicao(cliente, $event)"
                >
                  <Pencil :size="16" />
                </button>
                <button
                  v-if="pode('customers', 'delete')"
                  class="rounded-md p-1.5 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10"
                  @click="remover(cliente, $event)"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="!store.carregando && filtrados.length === 0">
            <td colspan="8" class="px-4 py-12 text-center text-[hsl(var(--muted-foreground))]">Nenhum cliente encontrado.</td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:open="dialogAberto" :title="clienteEmEdicao ? 'Editar Cliente' : 'Novo Cliente'">
      <CustomerForm
        :inicial="clienteEmEdicao ?? undefined"
        :a-guardar="aGuardar"
        @submeter="submeter"
        @cancelar="dialogAberto = false"
      />
    </Dialog>
  </div>
</template>
