import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { db } from '@/firebase/config'

/**
 * Gera um número sequencial atómico (ex: FAT-2026-000123) usando um documento
 * contador por tipo/ano em `counters/{tipo}-{ano}`. Usa uma transação Firestore
 * para evitar números duplicados em escritas concorrentes.
 */
export async function gerarNumeroSequencial(tipo: string, prefixo: string): Promise<string> {
  const ano = new Date().getFullYear()
  const counterRef = doc(db, 'counters', `${tipo}-${ano}`)

  const novoNumero = await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(counterRef)
    const atual = snap.exists() ? (snap.data().ultimoNumero as number) : 0
    const proximo = atual + 1
    transaction.set(counterRef, { ultimoNumero: proximo, ano }, { merge: true })
    return proximo
  })

  return `${prefixo}-${ano}-${String(novoNumero).padStart(6, '0')}`
}

export async function previsualizarProximoNumero(tipo: string, prefixo: string): Promise<string> {
  const ano = new Date().getFullYear()
  const counterRef = doc(db, 'counters', `${tipo}-${ano}`)
  const snap = await getDoc(counterRef)
  const atual = snap.exists() ? (snap.data().ultimoNumero as number) : 0
  return `${prefixo}-${ano}-${String(atual + 1).padStart(6, '0')}`
}
