import { limit, orderBy, where } from 'firebase/firestore'
import { createCollectionService } from '@/services/firestoreService'
import { calcularConsumo } from '@/utils/calculations'
import type { MeterReading } from '@/types/models'

export const meterReadingsService = createCollectionService<MeterReading>('meterReadings')

export function porContador(contadorId: string) {
  return where('contadorId', '==', contadorId)
}

export function porCliente(clienteId: string) {
  return where('clienteId', '==', clienteId)
}

export async function obterUltimaLeitura(contadorId: string): Promise<MeterReading | null> {
  const leituras = await meterReadingsService.listar(
    where('contadorId', '==', contadorId),
    orderBy('data', 'desc'),
    limit(1),
  )
  return leituras[0] ?? null
}

interface AuthContext {
  uid: string
  nome: string
}

export interface RegistarLeituraParams {
  clienteId: string
  contadorId: string
  data: number
  leituraAnterior: number
  leituraAtual: number
  leitorNome: string
  fotoUrl?: string
  observacoes?: string
  /** Só permitido a utilizadores com permissão de corrigir leituras (ex: admin/gestor). */
  forcarCorrecao?: boolean
  motivoCorrecao?: string
}

/**
 * Regista uma nova leitura calculando o consumo automaticamente.
 * Bloqueia leituras menores que a anterior a não ser que `forcarCorrecao` seja explicitamente
 * indicado por um utilizador autorizado (validado também nas regras de segurança do Firestore).
 */
export async function registarLeitura(params: RegistarLeituraParams, autor: AuthContext): Promise<string> {
  let consumo: number
  let corrigida = false

  if (params.leituraAtual < params.leituraAnterior) {
    if (!params.forcarCorrecao) {
      throw new Error(
        'A leitura atual é menor que a anterior. Se o contador foi trocado ou há um erro, peça a um utilizador autorizado para corrigir.',
      )
    }
    consumo = 0
    corrigida = true
  } else {
    consumo = calcularConsumo(params.leituraAnterior, params.leituraAtual)
  }

  return meterReadingsService.criar(
    {
      clienteId: params.clienteId,
      contadorId: params.contadorId,
      data: params.data,
      leituraAnterior: params.leituraAnterior,
      leituraAtual: params.leituraAtual,
      consumo,
      leitorId: autor.uid,
      leitorNome: params.leitorNome,
      fotoUrl: params.fotoUrl,
      corrigida,
      motivoCorrecao: params.motivoCorrecao,
      observacoes: params.observacoes,
      faturada: false,
    },
    autor,
  )
}
