<script setup lang="ts">
import { RouterLink } from 'vue-router'
import * as icons from 'lucide-vue-next'
import { usePermissions } from '@/composables/usePermissions'

defineProps<{ aberto: boolean }>()
const emit = defineEmits<{ fechar: [] }>()

const { menuVisivel } = usePermissions()

function iconFor(name: string) {
  return (icons as Record<string, unknown>)[name] ?? icons.Circle
}
</script>

<template>
  <transition name="fade">
    <div v-if="aberto" class="fixed inset-0 z-30 bg-black/40 md:hidden" @click="emit('fechar')" />
  </transition>

  <aside
    :class="[
      'fixed inset-y-0 left-0 z-40 w-64 transform border-r border-[hsl(var(--border))] bg-white transition-transform md:static md:translate-x-0',
      aberto ? 'translate-x-0' : '-translate-x-full',
    ]"
  >
    <div class="flex h-16 items-center gap-2 border-b border-[hsl(var(--border))] px-5">
      <div class="flex h-9 w-9 items-center justify-center rounded-lg bg-[hsl(var(--primary))] text-white">
        <icons.Droplets :size="20" />
      </div>
      <span class="text-lg font-bold text-[hsl(var(--foreground))]">AquaGest</span>
    </div>

    <nav class="flex flex-col gap-1 overflow-y-auto p-3">
      <RouterLink
        v-for="item in menuVisivel"
        :key="item.rota"
        :to="item.rota"
        class="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--accent))]"
        active-class="bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))]"
        @click="emit('fechar')"
      >
        <component :is="iconFor(item.icon)" :size="18" />
        {{ item.label }}
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
