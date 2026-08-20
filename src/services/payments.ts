import { createCollectionService } from '@/services/firestoreService'
import type { Payment } from '@/types/models'

// CRUD completo de pagamentos chega na Fase 2 (pagamentos parciais, recibos, atualização de saldo).
export const paymentsService = createCollectionService<Payment>('payments')
