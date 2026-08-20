<script setup lang="ts">
import { onMounted, ref } from 'vue'
import Sidebar from '@/components/layout/Sidebar.vue'
import Topbar from '@/components/layout/Topbar.vue'
import { useSettingsStore } from '@/stores/settings'

const menuAberto = ref(false)

const settings = useSettingsStore()
onMounted(() => {
  if (!settings.carregado) settings.carregar()
})
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-[hsl(var(--muted))]">
    <Sidebar :aberto="menuAberto" @fechar="menuAberto = false" />
    <div class="flex flex-1 flex-col overflow-hidden">
      <Topbar @abrir-menu="menuAberto = true" />
      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
