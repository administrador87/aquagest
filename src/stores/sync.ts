import { defineStore } from 'pinia'

interface SyncState {
  online: boolean
  pendentesPorColeccao: Record<string, number>
  ultimaSincronizacao: number | null
}

export const useSyncStore = defineStore('sync', {
  state: (): SyncState => ({
    online: navigator.onLine,
    pendentesPorColeccao: {},
    ultimaSincronizacao: null,
  }),

  getters: {
    totalPendentes: (state) => Object.values(state.pendentesPorColeccao).reduce((soma, n) => soma + n, 0),
  },

  actions: {
    iniciar() {
      window.addEventListener('online', () => {
        this.online = true
      })
      window.addEventListener('offline', () => {
        this.online = false
      })
    },

    definirPendentes(coleccao: string, quantidade: number) {
      this.pendentesPorColeccao[coleccao] = quantidade
      if (quantidade === 0 && Object.values(this.pendentesPorColeccao).every((n) => n === 0)) {
        this.ultimaSincronizacao = Date.now()
      }
    },
  },
})
