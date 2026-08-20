import { where } from 'firebase/firestore'
import { createCollectionService } from '@/services/firestoreService'
import type { Meter } from '@/types/models'

export const metersService = createCollectionService<Meter>('meters')

export function porCliente(clienteId: string) {
  return where('clienteId', '==', clienteId)
}

interface AuthContext {
  uid: string
  nome: string
}

/**
 * Troca o contador de um cliente: marca o contador atual como 'substituido' e cria
 * um novo contador ativo, mantendo a ligação entre ambos para preservar o histórico.
 */
export async function trocarContador(
  contadorAntigoId: string,
  novoContador: Omit<Meter, 'id' | 'substitui' | 'substituidoPor' | 'estado' | 'criadoEm' | 'atualizadoEm'>,
  autor: AuthContext,
): Promise<string> {
  const antigo = await metersService.obter(contadorAntigoId)
  if (!antigo) throw new Error('Contador antigo não encontrado.')

  const novoId = await metersService.criar(
    { ...novoContador, estado: 'ativo', substitui: contadorAntigoId },
    autor,
  )

  await metersService.atualizar(contadorAntigoId, { estado: 'substituido', substituidoPor: novoId }, autor, antigo)

  return novoId
}
