/** O Firestore rejeita campos com valor `undefined`. Esta função remove esses campos
 * (ao nível superior) antes de escrever um documento, mantendo `null` e valores "falsy" válidos. */
export function removerUndefined<T extends object>(obj: T): T {
  const limpo = { ...obj } as Record<string, unknown>
  for (const chave of Object.keys(limpo)) {
    if (limpo[chave] === undefined) {
      delete limpo[chave]
    }
  }
  return limpo as T
}
