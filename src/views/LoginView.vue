<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Droplets, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import type { UserRole } from '@/types/models'

const auth = useAuthStore()
const router = useRouter()
const route = useRoute()

const modo = ref<'login' | 'criar-admin'>('login')
const email = ref('')
const password = ref('')
const nome = ref('')
const papel = ref<UserRole>('admin')
const erro = ref('')
const aCarregar = ref(false)

const PAPEIS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'tecnico', label: 'Técnico/Leiturista' },
  { value: 'operador', label: 'Operador de Faturação' },
]

async function submeter() {
  erro.value = ''
  aCarregar.value = true
  try {
    if (modo.value === 'login') {
      await auth.login(email.value, password.value)
    } else {
      await auth.registar(nome.value, email.value, password.value, papel.value)
      await auth.login(email.value, password.value)
    }
    const destino = (route.query.redirect as string) || '/'
    router.push(destino)
  } catch (e) {
    erro.value = e instanceof Error ? traduzirErro(e.message) : 'Ocorreu um erro. Tente novamente.'
  } finally {
    aCarregar.value = false
  }
}

function traduzirErro(msg: string): string {
  if (msg.includes('auth/invalid-credential') || msg.includes('auth/wrong-password')) return 'Email ou palavra-passe incorretos.'
  if (msg.includes('auth/user-not-found')) return 'Utilizador não encontrado.'
  if (msg.includes('auth/email-already-in-use')) return 'Este email já está registado.'
  if (msg.includes('auth/weak-password')) return 'A palavra-passe deve ter pelo menos 6 caracteres.'
  if (msg.includes('auth/network-request-failed')) return 'Sem ligação à Internet. Verifique a sua rede.'
  return msg
}
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-[hsl(var(--muted))] p-4">
    <div class="w-full max-w-sm">
      <div class="mb-6 flex flex-col items-center gap-2">
        <div class="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(var(--primary))] text-white">
          <Droplets :size="28" />
        </div>
        <h1 class="text-xl font-bold text-[hsl(var(--foreground))]">AquaGest</h1>
        <p class="text-sm text-[hsl(var(--muted-foreground))]">ERP de Gestão e Faturação de Água</p>
      </div>

      <div class="rounded-lg border border-[hsl(var(--border))] bg-white p-6 shadow-sm">
        <form class="flex flex-col gap-4" @submit.prevent="submeter">
          <div v-if="modo === 'criar-admin'">
            <Label for="nome">Nome completo</Label>
            <Input id="nome" v-model="nome" placeholder="O seu nome" />
          </div>

          <div>
            <Label for="email">Email</Label>
            <Input id="email" v-model="email" type="email" placeholder="nome@empresa.com" />
          </div>

          <div>
            <Label for="password">Palavra-passe</Label>
            <Input id="password" v-model="password" type="password" placeholder="••••••••" />
          </div>

          <div v-if="modo === 'criar-admin'">
            <Label for="papel">Papel</Label>
            <Select id="papel" v-model="papel" :options="PAPEIS" />
          </div>

          <p v-if="erro" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">
            {{ erro }}
          </p>

          <Button type="submit" :disabled="aCarregar" class="w-full">
            <Loader2 v-if="aCarregar" :size="16" class="animate-spin" />
            {{ modo === 'login' ? 'Entrar' : 'Criar conta e entrar' }}
          </Button>
        </form>

        <button
          class="mt-4 w-full text-center text-xs text-[hsl(var(--muted-foreground))] underline"
          @click="modo = modo === 'login' ? 'criar-admin' : 'login'"
        >
          {{ modo === 'login' ? 'Primeira utilização? Criar conta de administrador' : 'Já tenho conta — voltar ao login' }}
        </button>
      </div>
    </div>
  </div>
</template>
