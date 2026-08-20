<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Menu, Wifi, WifiOff, RefreshCw, LogOut, ChevronDown } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { useOnlineStatus } from '@/composables/useOnlineStatus'

const emit = defineEmits<{ abrirMenu: [] }>()
const auth = useAuthStore()
const router = useRouter()
const { online, totalPendentes } = useOnlineStatus()

const menuAberto = ref(false)

const ROTULO_PAPEL: Record<string, string> = {
  admin: 'Administrador',
  gestor: 'Gestor',
  tecnico: 'Técnico/Leiturista',
  operador: 'Operador de Faturação',
}

async function terminarSessao() {
  await auth.terminarSessao()
  router.push('/login')
}
</script>

<template>
  <header class="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-[hsl(var(--border))] bg-white px-4 md:px-6">
    <button class="rounded-md p-2 hover:bg-[hsl(var(--accent))] md:hidden" @click="emit('abrirMenu')">
      <Menu :size="20" />
    </button>

    <div class="flex items-center gap-2">
      <span
        :class="[
          'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
          online ? 'bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]' : 'bg-[hsl(var(--destructive))]/10 text-[hsl(var(--destructive))]',
        ]"
      >
        <Wifi v-if="online" :size="14" />
        <WifiOff v-else :size="14" />
        {{ online ? 'ONLINE' : 'OFFLINE' }}
      </span>

      <span
        v-if="totalPendentes > 0"
        class="flex items-center gap-1.5 rounded-full bg-[hsl(var(--warning))]/10 px-3 py-1 text-xs font-medium text-[hsl(var(--warning))]"
        :title="`${totalPendentes} operação(ões) por sincronizar`"
      >
        <RefreshCw :size="14" class="animate-spin" />
        {{ totalPendentes }} por sincronizar
      </span>
    </div>

    <div class="relative">
      <button
        class="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-[hsl(var(--accent))]"
        @click="menuAberto = !menuAberto"
      >
        <div class="flex h-8 w-8 items-center justify-center rounded-full bg-[hsl(var(--primary))] text-sm font-semibold text-white">
          {{ auth.perfil?.nome?.charAt(0)?.toUpperCase() ?? '?' }}
        </div>
        <div class="hidden text-left sm:block">
          <p class="text-sm font-medium leading-tight">{{ auth.perfil?.nome }}</p>
          <p class="text-xs leading-tight text-[hsl(var(--muted-foreground))]">
            {{ auth.perfil?.papel ? ROTULO_PAPEL[auth.perfil.papel] : '' }}
          </p>
        </div>
        <ChevronDown :size="16" />
      </button>

      <div
        v-if="menuAberto"
        class="absolute right-0 top-full mt-1 w-48 rounded-md border border-[hsl(var(--border))] bg-white py-1 shadow-lg"
        @click="menuAberto = false"
      >
        <button
          class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-[hsl(var(--accent))]"
          @click="terminarSessao"
        >
          <LogOut :size="16" />
          Terminar sessão
        </button>
      </div>
    </div>
  </header>
</template>
