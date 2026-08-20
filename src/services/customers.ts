import { where } from 'firebase/firestore'
import { createCollectionService } from '@/services/firestoreService'
import type { Customer } from '@/types/models'

export const customersService = createCollectionService<Customer>('customers')

export async function gerarCodigoCliente(): Promise<string> {
  const ano = new Date().getFullYear()
  const todos = await customersService.listar()
  const doAno = todos.filter((c) => c.codigo?.startsWith(`CL-${ano}-`))
  const proximo = doAno.length + 1
  return `CL-${ano}-${String(proximo).padStart(5, '0')}`
}

export function porZona(zona: string) {
  return where('zona', '==', zona)
}

export function porEstado(estado: Customer['estado']) {
  return where('estado', '==', estado)
}
