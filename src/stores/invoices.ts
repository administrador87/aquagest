import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { invoicesService } from '@/services/invoices'
import { cancelarFatura, gerarFaturaParaLeitura, gerarFaturasEmMassa, listarLeiturasPorFaturar } from '@/services/billing'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useSyncStore } from '@/stores/sync'
import type { Invoice } from '@/types/models'

interface InvoicesState {
  itens: Invoice[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useInvoicesStore = defineStore('invoices', {
  state: (): InvoicesState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    porCliente: (state) => (clienteId: string) =>
      [...state.itens.filter((f) => f.clienteId === clienteId)].sort((a, b) => b.dataEmissao - a.dataEmissao),
    porId: (state) => (id: string) => state.itens.find((f) => f.id === id),
    ordenadas: (state) => [...state.itens].sort((a, b) => b.dataEmissao - a.dataEmissao),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = invoicesService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('invoices', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async gerarDeLeitura(leituraId: string) {
      const auth = useAuthStore()
      const settings = useSettingsStore()
      return gerarFaturaParaLeitura(leituraId, auth.contexto, settings.dados.diasVencimentoFatura, settings.dados.prefixoFatura)
    },

    async gerarEmMassa(leituraIds: string[]) {
      const auth = useAuthStore()
      const settings = useSettingsStore()
      return gerarFaturasEmMassa(leituraIds, auth.contexto, settings.dados.diasVencimentoFatura, settings.dados.prefixoFatura)
    },

    async cancelar(faturaId: string) {
      const auth = useAuthStore()
      return cancelarFatura(faturaId, auth.contexto)
    },

    async leiturasPorFaturar(clienteId?: string) {
      return listarLeiturasPorFaturar(clienteId)
    },
  },
})
