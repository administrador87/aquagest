import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { paymentsService } from '@/services/payments'
import { registarPagamentoCompleto } from '@/services/paymentsFlow'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useSyncStore } from '@/stores/sync'
import type { Payment, PaymentMethod } from '@/types/models'

interface PaymentsState {
  itens: Payment[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const usePaymentsStore = defineStore('payments', {
  state: (): PaymentsState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    porCliente: (state) => (clienteId: string) =>
      [...state.itens.filter((p) => p.clienteId === clienteId)].sort((a, b) => b.data - a.data),
    ordenados: (state) => [...state.itens].sort((a, b) => b.data - a.data),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = paymentsService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('payments', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async registar(params: { clienteId: string; valor: number; metodo: PaymentMethod; referencia?: string; observacoes?: string }) {
      const auth = useAuthStore()
      const settings = useSettingsStore()
      return registarPagamentoCompleto(params, auth.contexto, settings.dados.prefixoRecibo)
    },
  },
})
