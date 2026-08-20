import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { customersService, gerarCodigoCliente } from '@/services/customers'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import type { Customer } from '@/types/models'

interface CustomersState {
  itens: Customer[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useCustomersStore = defineStore('customers', {
  state: (): CustomersState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    ativos: (state) => state.itens.filter((c) => c.estado === 'ativo'),
    porId: (state) => (id: string) => state.itens.find((c) => c.id === id),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = customersService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('customers', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async criar(dados: Omit<Customer, 'id' | 'criadoEm' | 'atualizadoEm' | 'codigo' | 'saldoAtual'>) {
      const auth = useAuthStore()
      const codigo = await gerarCodigoCliente()
      return customersService.criar({ ...dados, codigo, saldoAtual: 0 }, auth.contexto)
    },

    async atualizar(id: string, dados: Partial<Customer>) {
      const auth = useAuthStore()
      const anterior = this.porId(id)
      return customersService.atualizar(id, dados, auth.contexto, anterior)
    },

    async remover(id: string) {
      const auth = useAuthStore()
      const anterior = this.porId(id)
      return customersService.remover(id, auth.contexto, anterior)
    },
  },
})
