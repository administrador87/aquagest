import { computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { MENU_ITENS, podeExecutar, type Action, type Module } from '@/config/permissions'

export function usePermissions() {
  const auth = useAuthStore()

  function pode(modulo: Module, accao: Action): boolean {
    return podeExecutar(auth.papel, modulo, accao)
  }

  const menuVisivel = computed(() => MENU_ITENS.filter((item) => pode(item.modulo, 'view')))

  return { pode, menuVisivel }
}
