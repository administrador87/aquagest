import { doc, runTransaction, where } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { createCollectionService } from '@/services/firestoreService'
import { registarAuditoria } from '@/services/auditLog'
import { removerUndefined } from '@/utils/firestoreSanitize'
import type { Tariff } from '@/types/models'

export const tariffsService = createCollectionService<Tariff>('tariffs')

export async function obterTarifaAtiva(): Promise<Tariff | null> {
  const ativas = await tariffsService.listar(where('ativa', '==', true))
  return ativas[0] ?? null
}

interface AuthContext {
  uid: string
  nome: string
}

/**
 * Cria uma nova versão de tarifa e desativa a anterior (definindo `validoAte`), preservando-a
 * intacta para que faturas antigas continuem a usar o snapshot da tarifa que tinham aplicada.
 */
export async function criarNovaTarifa(
  dados: Omit<Tariff, 'id' | 'criadoEm' | 'ativa' | 'validoAte'>,
  autor: AuthContext,
): Promise<string> {
  const tarifaAnterior = await obterTarifaAtiva()
  const novaRef = doc(tariffsService.colRef)

  await runTransaction(db, async (transaction) => {
    if (tarifaAnterior) {
      transaction.update(doc(db, 'tariffs', tarifaAnterior.id), {
        ativa: false,
        validoAte: dados.validoDesde,
      })
    }
    transaction.set(
      novaRef,
      removerUndefined({ ...dados, ativa: true, validoAte: null, criadoEm: Date.now() }),
    )
  })

  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'criar',
    coleccao: 'tariffs',
    documentoId: novaRef.id,
    valorNovo: dados,
  })

  return novaRef.id
}
