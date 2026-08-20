import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { usersService, criarUtilizador, atualizarUtilizador } from '@/services/users'
import { useAuthStore } from '@/stores/auth'
import type { AppUser, UserRole } from '@/types/models'

interface UsersState {
  itens: AppUser[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useUsersStore = defineStore('users', {
  state: (): UsersState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    ordenados: (state) => [...state.itens].sort((a, b) => a.nome.localeCompare(b.nome)),
    porId: (state) => (id: string) => state.itens.find((u) => u.id === id),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      this.unsubscribe = usersService.ouvir((itens) => {
        this.itens = itens
        this.carregando = false
      })
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async criar(nome: string, email: string, password: string, papel: UserRole) {
      const auth = useAuthStore()
      return criarUtilizador(nome, email, password, papel, auth.contexto)
    },

    async atualizar(uid: string, dados: Partial<Pick<AppUser, 'nome' | 'papel' | 'ativo'>>) {
      const auth = useAuthStore()
      const anterior = this.porId(uid)
      return atualizarUtilizador(uid, dados, auth.contexto, anterior)
    },
  },
})
