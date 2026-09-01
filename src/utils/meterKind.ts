import type { Meter, MeterKind } from '@/types/models'

/** Contadores criados antes da introdução do campo `tipo` não o têm gravado — tratam-se
 * sempre como 'cliente', o único tipo que existia nessa altura. */
export function tipoContador(contador: Pick<Meter, 'tipo'>): MeterKind {
  return contador.tipo ?? 'cliente'
}
