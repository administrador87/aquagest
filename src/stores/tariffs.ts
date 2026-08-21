import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { criarNovaTarifa, tariffsService } from '@/services/tariffs'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import type { Tariff } from '@/types/models'

interface TariffsState {
  itens: Tariff[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useTariffsStore = defineStore('tariffs', {
  state: (): TariffsState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    ativa: (state) => state.itens.find((t) => t.ativa),
    historico: (state) => [...state.itens].sort((a, b) => b.validoDesde - a.validoDesde),
    porId: (state) => (id: string) => state.itens.find((t) => t.id === id),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = tariffsService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('tariffs', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async criar(dados: Omit<Tariff, 'id' | 'criadoEm' | 'ativa' | 'validoAte'>) {
      const auth = useAuthStore()
      return criarNovaTarifa(dados, auth.contexto)
    },

    /** Apaga uma versão de tarifa do histórico. Nunca a ativa — faturas já emitidas mantêm o
     * seu próprio snapshot da tarifa, por isso não são afetadas. */
    async remover(id: string) {
      const tarifa = this.porId(id)
      if (tarifa?.ativa) throw new Error('Não é possível apagar a tarifa ativa.')
      const auth = useAuthStore()
      return tariffsService.remover(id, auth.contexto, tarifa)
    },
  },
})
