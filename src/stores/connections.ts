import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import {
  atualizarEstadoLigacao,
  concluirInstalacaoEConverterCliente,
  connectionsService,
  criarPedidoLigacao,
} from '@/services/connections'
import { useAuthStore } from '@/stores/auth'
import { useSettingsStore } from '@/stores/settings'
import { useSyncStore } from '@/stores/sync'
import type { Connection, ConnectionStatus } from '@/types/models'

interface ConnectionsState {
  itens: Connection[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useConnectionsStore = defineStore('connections', {
  state: (): ConnectionsState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    ordenados: (state) => [...state.itens].sort((a, b) => b.dataPedido - a.dataPedido),
    porId: (state) => (id: string) => state.itens.find((c) => c.id === id),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = connectionsService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('connections', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async criar(dados: Omit<Connection, 'id' | 'criadoEm' | 'atualizadoEm' | 'numeroPedido' | 'estado' | 'valorPendente'>) {
      const auth = useAuthStore()
      const settings = useSettingsStore()
      return criarPedidoLigacao(dados, auth.contexto, settings.dados.prefixoPedido)
    },

    async atualizarEstado(id: string, estado: ConnectionStatus) {
      const auth = useAuthStore()
      return atualizarEstadoLigacao(id, estado, auth.contexto)
    },

    async concluirInstalacao(id: string, contador: Parameters<typeof concluirInstalacaoEConverterCliente>[1]) {
      const auth = useAuthStore()
      return concluirInstalacaoEConverterCliente(id, contador, auth.contexto)
    },
  },
})
