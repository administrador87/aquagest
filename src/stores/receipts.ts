import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { receiptsService } from '@/services/receipts'
import { useSyncStore } from '@/stores/sync'
import type { Receipt } from '@/types/models'

interface ReceiptsState {
  itens: Receipt[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useReceiptsStore = defineStore('receipts', {
  state: (): ReceiptsState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    porCliente: (state) => (clienteId: string) =>
      [...state.itens.filter((r) => r.clienteId === clienteId)].sort((a, b) => b.data - a.data),
    ordenados: (state) => [...state.itens].sort((a, b) => b.data - a.data),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = receiptsService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('receipts', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },
  },
})
