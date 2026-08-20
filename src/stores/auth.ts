import { defineStore } from 'pinia'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth'
import { auth } from '@/firebase/config'
import { criarPerfilUtilizador, obterUtilizadorPorId, atualizarUltimoLogin } from '@/services/users'
import { podeExecutar, type Action, type Module } from '@/config/permissions'
import type { AppUser, UserRole } from '@/types/models'

interface AuthState {
  firebaseUser: FirebaseUser | null
  perfil: AppUser | null
  carregando: boolean
  inicializado: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    firebaseUser: null,
    perfil: null,
    carregando: false,
    inicializado: false,
  }),

  getters: {
    autenticado: (state) => !!state.firebaseUser && !!state.perfil,
    papel: (state): UserRole | undefined => state.perfil?.papel,
    contexto: (state) => ({ uid: state.firebaseUser?.uid ?? '', nome: state.perfil?.nome ?? 'Desconhecido' }),
  },

  actions: {
    /** Liga o listener de estado de autenticação do Firebase; deve ser chamado uma vez no arranque. */
    iniciar() {
      return new Promise<void>((resolve) => {
        onAuthStateChanged(auth, async (user) => {
          this.firebaseUser = user
          if (user) {
            this.perfil = await obterUtilizadorPorId(user.uid)
            atualizarUltimoLogin(user.uid).catch(() => {})
          } else {
            this.perfil = null
          }
          this.inicializado = true
          resolve()
        })
      })
    },

    async login(email: string, password: string) {
      this.carregando = true
      try {
        const cred = await signInWithEmailAndPassword(auth, email, password)
        this.firebaseUser = cred.user
        this.perfil = await obterUtilizadorPorId(cred.user.uid)
        if (!this.perfil) {
          throw new Error('Conta sem perfil associado. Contacte um administrador.')
        }
        if (!this.perfil.ativo) {
          await signOut(auth)
          throw new Error('Esta conta está inativa. Contacte um administrador.')
        }
      } finally {
        this.carregando = false
      }
    },

    /** Regista um novo utilizador. Normalmente só usado pelo admin a partir do módulo Utilizadores. */
    async registar(nome: string, email: string, password: string, papel: UserRole) {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: nome })
      const novoPerfil: Omit<AppUser, 'id'> = {
        nome,
        email,
        papel,
        ativo: true,
        criadoEm: Date.now(),
      }
      await criarPerfilUtilizador(cred.user.uid, novoPerfil)
      return cred.user.uid
    },

    async terminarSessao() {
      await signOut(auth)
      this.firebaseUser = null
      this.perfil = null
    },

    pode(modulo: Module, accao: Action): boolean {
      return podeExecutar(this.papel, modulo, accao)
    },
  },
})
