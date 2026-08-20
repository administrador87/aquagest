import { initializeApp } from 'firebase/app'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'
import { connectAuthEmulator, getAuth } from 'firebase/auth'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

if (!firebaseConfig.apiKey) {
  // eslint-disable-next-line no-console
  console.warn(
    '[Firebase] Configuração em falta. Copie .env.example para .env e preencha as credenciais do seu projeto Firebase (ver docs/DEPLOYMENT.md).',
  )
}

export const firebaseApp = initializeApp(firebaseConfig)

// Persistência offline: cache local que sobrevive a reinícios do browser e é
// partilhada entre separadores, permitindo ler/escrever dados sem ligação à Internet.
export const db = initializeFirestore(firebaseApp, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
})

export const auth = getAuth(firebaseApp)

// Em desenvolvimento local sem um projeto Firebase real, liga-se aos emuladores
// (ver docs/DEPLOYMENT.md e README de desenvolvimento). Ativado via VITE_USE_FIREBASE_EMULATORS=true.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
}
