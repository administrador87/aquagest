import { defineStore } from 'pinia'
import {
  configuracoesPorDefeito,
  guardarConfiguracoes,
  obterConfiguracoes,
  sincronizarInfoPublicaPagamento,
} from '@/services/settings'
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
        // Junta com os valores por defeito para preencher campos adicionados em versões
        // mais recentes que ainda não existam num documento de configurações mais antigo.
        this.dados = { ...configuracoesPorDefeito(), ...existentes }
      } else {
        this.dados = configuracoesPorDefeito()
        await guardarConfiguracoes(this.dados)
        // Só um admin tem permissão de escrita em publicPaymentInfo; noutros papéis este é o
        // primeiro acesso à app antes de o admin ter configurado nada, por isso ignoramos o erro.
        await sincronizarInfoPublicaPagamento(this.dados).catch(() => {})
      }
      this.carregado = true
    },

    async atualizar(dados: Partial<Omit<AppSettings, 'id'>>) {
      this.dados = { ...this.dados, ...dados }
      await guardarConfiguracoes(dados)
      await sincronizarInfoPublicaPagamento(this.dados)
    },
  },
})
