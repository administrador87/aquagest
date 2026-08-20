<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { Plus } from 'lucide-vue-next'
import { useUsersStore } from '@/stores/users'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'
import Badge from '@/components/ui/Badge.vue'
import Select from '@/components/ui/Select.vue'
import Dialog from '@/components/ui/Dialog.vue'
import UserForm from '@/components/users/UserForm.vue'
import { formatDateTime } from '@/utils/dateRange'
import type { UserRole } from '@/types/models'

const store = useUsersStore()
const auth = useAuthStore()

const dialogAberto = ref(false)
const aGuardar = ref(false)
const erro = ref('')

onMounted(() => store.ouvir())
onUnmounted(() => store.pararDeOuvir())

const PAPEL_LABEL: Record<UserRole, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  tecnico: 'Técnico/Leiturista',
  operador: 'Operador de Faturação',
}
const PAPEIS = Object.entries(PAPEL_LABEL).map(([value, label]) => ({ value, label }))

async function submeter(dados: { nome: string; email: string; password: string; papel: UserRole }) {
  erro.value = ''
  aGuardar.value = true
  try {
    await store.criar(dados.nome, dados.email, dados.password, dados.papel)
    dialogAberto.value = false
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível criar o utilizador.'
  } finally {
    aGuardar.value = false
  }
}

async function alterarPapel(uid: string, papel: string) {
  await store.atualizar(uid, { papel: papel as UserRole })
}

async function alternarAtivo(uid: string, ativo: boolean) {
  await store.atualizar(uid, { ativo: !ativo })
}
</script>

<template>
  <div>
    <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <h1 class="text-2xl font-bold text-[hsl(var(--foreground))]">Utilizadores</h1>
      <Button @click="dialogAberto = true; erro = ''">
        <Plus :size="16" /> Novo Utilizador
      </Button>
    </div>

    <div class="overflow-x-auto rounded-lg border border-[hsl(var(--border))] bg-white">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[hsl(var(--border))] bg-[hsl(var(--muted))] text-left text-xs text-[hsl(var(--muted-foreground))]">
            <th class="px-4 py-3 font-medium">Nome</th>
            <th class="px-4 py-3 font-medium">Email</th>
            <th class="px-4 py-3 font-medium">Papel</th>
            <th class="px-4 py-3 font-medium">Último Login</th>
            <th class="px-4 py-3 font-medium">Estado</th>
            <th class="px-4 py-3 font-medium text-right">Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="u in store.ordenados" :key="u.id" class="border-b border-[hsl(var(--border))] last:border-0">
            <td class="px-4 py-3 font-medium">{{ u.nome }}</td>
            <td class="px-4 py-3">{{ u.email }}</td>
            <td class="px-4 py-3">
              <Select
                :model-value="u.papel"
                :options="PAPEIS"
                :disabled="u.id === auth.firebaseUser?.uid"
                class="h-8 py-0 text-xs"
                @update:model-value="(v) => alterarPapel(u.id, String(v))"
              />
            </td>
            <td class="px-4 py-3 text-[hsl(var(--muted-foreground))]">{{ u.ultimoLogin ? formatDateTime(u.ultimoLogin) : '—' }}</td>
            <td class="px-4 py-3"><Badge :tone="u.ativo ? 'success' : 'muted'">{{ u.ativo ? 'Ativo' : 'Inativo' }}</Badge></td>
            <td class="px-4 py-3 text-right">
              <button
                v-if="u.id !== auth.firebaseUser?.uid"
                class="rounded-md px-2 py-1 text-xs font-medium hover:bg-[hsl(var(--accent))]"
                @click="alternarAtivo(u.id, u.ativo)"
              >
                {{ u.ativo ? 'Desativar' : 'Ativar' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Dialog v-model:open="dialogAberto" title="Novo Utilizador">
      <p v-if="erro" class="mb-3 rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro }}</p>
      <UserForm :a-guardar="aGuardar" @submeter="submeter" @cancelar="dialogAberto = false" />
    </Dialog>
  </div>
</template>
