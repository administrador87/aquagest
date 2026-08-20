import { defineStore } from 'pinia'
import { orderBy, type Unsubscribe } from 'firebase/firestore'
import { financialTransactionsService, porCliente } from '@/services/financialTransactions'
import type { FinancialTransaction } from '@/types/models'

interface FinancialTransactionsState {
  itensPorCliente: Record<string, FinancialTransaction[]>
  unsubscribes: Record<string, Unsubscribe>
}

export const useFinancialTransactionsStore = defineStore('financialTransactions', {
  state: (): FinancialTransactionsState => ({
    itensPorCliente: {},
    unsubscribes: {},
  }),

  getters: {
    extratoDoCliente: (state) => (clienteId: string) =>
      [...(state.itensPorCliente[clienteId] ?? [])].sort((a, b) => b.data - a.data),
  },

  actions: {
    ouvirParaCliente(clienteId: string) {
      if (this.unsubscribes[clienteId]) return
      this.unsubscribes[clienteId] = financialTransactionsService.ouvir(
        (itens) => {
          this.itensPorCliente[clienteId] = itens
        },
        {},
        porCliente(clienteId),
        orderBy('data', 'desc'),
      )
    },

    pararDeOuvirCliente(clienteId: string) {
      this.unsubscribes[clienteId]?.()
      delete this.unsubscribes[clienteId]
    },
  },
})
