import { createCollectionService } from '@/services/firestoreService'
import type { Invoice } from '@/types/models'

// CRUD completo de faturação chega na Fase 2 (numeração, cálculo por tarifa, PDF, estados).
// Por agora expõe-se apenas a leitura/escrita genérica para o Dashboard poder agregar dados reais.
export const invoicesService = createCollectionService<Invoice>('invoices')
