import { where } from 'firebase/firestore'
import { createCollectionService } from '@/services/firestoreService'
import type { FinancialTransaction } from '@/types/models'

// As escritas nesta coleção acontecem sempre dentro de batches atómicos em services/billing.ts
// e services/paymentsFlow.ts (nunca isoladamente), para garantir consistência com faturas/pagamentos/saldo.
export const financialTransactionsService = createCollectionService<FinancialTransaction>('financialTransactions')

export function porCliente(clienteId: string) {
  return where('clienteId', '==', clienteId)
}
