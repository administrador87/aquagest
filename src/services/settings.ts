import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { removerUndefined } from '@/utils/firestoreSanitize'
import type { AppSettings } from '@/types/models'

const SETTINGS_DOC_ID = 'geral'

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

export function configuracoesPorDefeito(): Omit<AppSettings, 'id'> {
  return {
    nomeEmpresa: 'Empresa de Águas',
    moedaCodigo: import.meta.env.VITE_DEFAULT_CURRENCY_CODE || 'MZN',
    moedaSimbolo: import.meta.env.VITE_DEFAULT_CURRENCY_SYMBOL || 'MT',
    prefixoFatura: 'FAT',
    prefixoRecibo: 'REC',
    prefixoPedido: 'PED',
    diasVencimentoFatura: 15,
    atualizadoEm: Date.now(),
  }
}
