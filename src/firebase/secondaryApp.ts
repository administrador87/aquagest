import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { firebaseApp } from '@/firebase/config'

const SECONDARY_APP_NAME = 'Secondary'

/**
 * Uma segunda instância da app Firebase, usada apenas para criar novos utilizadores a partir do
 * módulo Utilizadores. Necessária porque `createUserWithEmailAndPassword` troca automaticamente
 * a sessão ativa para a conta recém-criada — usando uma app separada evitamos "roubar" a sessão
 * do administrador que está a criar a conta.
 */
export function obterAppSecundaria() {
  const existente = getApps().find((a) => a.name === SECONDARY_APP_NAME)
  if (existente) return existente
  return initializeApp(firebaseApp.options, SECONDARY_APP_NAME)
}

let emuladorLigado = false

export function obterAuthSecundaria() {
  const auth = getAuth(obterAppSecundaria())
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true' && !emuladorLigado) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
    emuladorLigado = true
  }
  return auth
}
