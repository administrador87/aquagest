import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { removerUndefined } from '@/utils/firestoreSanitize'
import type { AppSettings, MetodoPagamentoInfo } from '@/types/models'

const SETTINGS_DOC_ID = 'geral'
const METODO_VAZIO: MetodoPagamentoInfo = { ativo: true, numero: '', icone: '' }

export async function obterConfiguracoes(): Promise<AppSettings | null> {
  const snap = await getDoc(doc(db, 'settings', SETTINGS_DOC_ID))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AppSettings) : null
}

export async function guardarConfiguracoes(dados: Partial<Omit<AppSettings, 'id'>>): Promise<void> {
  await setDoc(
    doc(db, 'settings', SETTINGS_DOC_ID),
    removerUndefined({ ...dados, atualizadoEm: Date.now() }),
    { merge: true },
  )
}

/** Espelha o subconjunto de dados de pagamento (não sensível, igual ao que já vai impresso no
 * documento em papel) para um documento de leitura pública — é o que a página aberta pelo QR
 * code das faturas/recibos consulta, sem precisar de autenticação. */
export async function sincronizarInfoPublicaPagamento(dados: Omit<AppSettings, 'id'>): Promise<void> {
  await setDoc(
    doc(db, 'publicPaymentInfo', SETTINGS_DOC_ID),
    removerUndefined({
      nomeEmpresa: dados.nomeEmpresa,
      banco: dados.banco ?? '',
      numeroConta: dados.numeroConta ?? '',
      nib: dados.nib ?? '',
      metodoMpesa: dados.metodoMpesa ?? METODO_VAZIO,
      metodoEmola: dados.metodoEmola ?? METODO_VAZIO,
      metodoTransferencia: dados.metodoTransferencia ?? METODO_VAZIO,
      metodoOutro: dados.metodoOutro ?? METODO_VAZIO,
      atualizadoEm: Date.now(),
    }),
    { merge: false },
  )
}

export function configuracoesPorDefeito(): Omit<AppSettings, 'id'> {
  return {
    nomeEmpresa: 'Empresa de Águas',
    moedaCodigo: import.meta.env.VITE_DEFAULT_CURRENCY_CODE || 'MZN',
    moedaSimbolo: import.meta.env.VITE_DEFAULT_CURRENCY_SYMBOL || 'MT',
    prefixoFatura: 'FAT',
    prefixoRecibo: 'REC',
    prefixoPedido: 'PED',
    diasVencimentoFatura: 15,
    codigoPaisWhatsapp: '258',
    banco: '',
    numeroConta: '',
    nib: '',
    metodoMpesa: { ...METODO_VAZIO },
    metodoEmola: { ...METODO_VAZIO },
    metodoTransferencia: { ...METODO_VAZIO },
    metodoOutro: { ...METODO_VAZIO },
    atualizadoEm: Date.now(),
  }
}
