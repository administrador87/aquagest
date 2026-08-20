import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { removerUndefined } from '@/utils/firestoreSanitize'
import type { AuditLog } from '@/types/models'

interface RegistarAuditoriaParams {
  utilizadorId: string
  utilizadorNome: string
  operacao: AuditLog['operacao']
  coleccao: string
  documentoId: string
  valorAnterior?: unknown
  valorNovo?: unknown
}

/**
 * Regista uma entrada de auditoria. Não bloqueia a operação principal em caso de falha
 * (ex: offline) - a escrita fica em fila local do Firestore como qualquer outro documento.
 */
export async function registarAuditoria(params: RegistarAuditoriaParams): Promise<void> {
  const entrada: Omit<AuditLog, 'id'> = {
    utilizadorId: params.utilizadorId,
    utilizadorNome: params.utilizadorNome,
    operacao: params.operacao,
    coleccao: params.coleccao,
    documentoId: params.documentoId,
    valorAnterior: params.valorAnterior,
    valorNovo: params.valorNovo,
    timestamp: Date.now(),
  }
  await addDoc(collection(db, 'auditLogs'), removerUndefined(entrada))
}
