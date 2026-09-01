import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { metersService, trocarContador } from '@/services/meters'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import { tipoContador } from '@/utils/meterKind'
import type { Meter } from '@/types/models'

interface MetersState {
  itens: Meter[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useMetersStore = defineStore('meters', {
  state: (): MetersState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    porCliente: (state) => (clienteId: string) => state.itens.filter((m) => m.clienteId === clienteId),
    ativoPorCliente: (state) => (clienteId: string) =>
      state.itens.find((m) => m.clienteId === clienteId && m.estado === 'ativo'),
    porId: (state) => (id: string) => state.itens.find((m) => m.id === id),
    contadoresDaFonte: (state) => state.itens.filter((m) => tipoContador(m) === 'fonte'),
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = metersService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('meters', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async criar(dados: Omit<Meter, 'id' | 'criadoEm' | 'atualizadoEm'>) {
      const auth = useAuthStore()
      return metersService.criar(dados, auth.contexto)
    },

    async atualizar(id: string, dados: Partial<Meter>) {
      const auth = useAuthStore()
      const anterior = this.porId(id)
      return metersService.atualizar(id, dados, auth.contexto, anterior)
    },

    async trocar(
      contadorAntigoId: string,
      novoContador: Omit<Meter, 'id' | 'substitui' | 'substituidoPor' | 'estado' | 'criadoEm' | 'atualizadoEm'>,
    ) {
      const auth = useAuthStore()
      return trocarContador(contadorAntigoId, novoContador, auth.contexto)
    },
  },
})
