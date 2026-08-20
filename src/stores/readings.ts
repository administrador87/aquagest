import { defineStore } from 'pinia'
import type { Unsubscribe } from 'firebase/firestore'
import { meterReadingsService, registarLeitura, type RegistarLeituraParams } from '@/services/meterReadings'
import { useAuthStore } from '@/stores/auth'
import { useSyncStore } from '@/stores/sync'
import type { MeterReading } from '@/types/models'

interface ReadingsState {
  itens: MeterReading[]
  carregando: boolean
  unsubscribe: Unsubscribe | null
}

export const useReadingsStore = defineStore('readings', {
  state: (): ReadingsState => ({
    itens: [],
    carregando: false,
    unsubscribe: null,
  }),

  getters: {
    porCliente: (state) => (clienteId: string) =>
      [...state.itens.filter((r) => r.clienteId === clienteId)].sort((a, b) => b.data - a.data),
    porContador: (state) => (contadorId: string) =>
      [...state.itens.filter((r) => r.contadorId === contadorId)].sort((a, b) => b.data - a.data),
    ultimaPorContador: (state) => (contadorId: string) =>
      [...state.itens.filter((r) => r.contadorId === contadorId)].sort((a, b) => b.data - a.data)[0],
  },

  actions: {
    ouvir() {
      if (this.unsubscribe) return
      this.carregando = true
      const sync = useSyncStore()
      this.unsubscribe = meterReadingsService.ouvir(
        (itens) => {
          this.itens = itens
          this.carregando = false
        },
        { aoContarPendentes: (n) => sync.definirPendentes('meterReadings', n) },
      )
    },

    pararDeOuvir() {
      this.unsubscribe?.()
      this.unsubscribe = null
    },

    async registar(params: RegistarLeituraParams) {
      const auth = useAuthStore()
      return registarLeitura(params, auth.contexto)
    },
  },
})
