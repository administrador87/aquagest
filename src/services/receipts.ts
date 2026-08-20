import { createCollectionService } from '@/services/firestoreService'
import type { Receipt } from '@/types/models'

// A criação de recibos acontece sempre dentro do batch atómico em services/paymentsFlow.ts.
export const receiptsService = createCollectionService<Receipt>('receipts')
