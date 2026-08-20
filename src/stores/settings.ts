import { defineStore } from 'pinia'
import { configuracoesPorDefeito, guardarConfiguracoes, obterConfiguracoes } from '@/services/settings'
import type { AppSettings } from '@/types/models'

interface SettingsState {
  dados: Omit<AppSettings, 'id'>
  carregado: boolean
}

export const useSettingsStore = defineStore('settings', {
  state: (): SettingsState => ({
    dados: configuracoesPorDefeito(),
    carregado: false,
  }),

  getters: {
    moedaSimbolo: (state) => state.dados.moedaSimbolo,
    moedaCodigo: (state) => state.dados.moedaCodigo,
    nomeEmpresa: (state) => state.dados.nomeEmpresa,
  },

  actions: {
    async carregar() {
      const existentes = await obterConfiguracoes()
      if (existentes) {
        this.dados = existentes
      } else {
        this.dados = configuracoesPorDefeito()
        await guardarConfiguracoes(this.dados)
      }
      this.carregado = true
    },

    async atualizar(dados: Partial<Omit<AppSettings, 'id'>>) {
      this.dados = { ...this.dados, ...dados }
      await guardarConfiguracoes(dados)
    },
  },
})
