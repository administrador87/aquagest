import { doc, getDoc, setDoc } from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { db } from '@/firebase/config'
import { obterAuthSecundaria } from '@/firebase/secondaryApp'
import { createCollectionService } from '@/services/firestoreService'
import { registarAuditoria } from '@/services/auditLog'
import type { AppUser, UserRole } from '@/types/models'

export const usersService = createCollectionService<AppUser>('users')

export async function obterUtilizadorPorId(uid: string): Promise<AppUser | null> {
  const snap = await getDoc(doc(db, 'users', uid))
  return snap.exists() ? ({ id: snap.id, ...snap.data() } as AppUser) : null
}

/** Cria o documento de perfil do utilizador com o mesmo id do uid do Firebase Auth. */
export async function criarPerfilUtilizador(uid: string, dados: Omit<AppUser, 'id'>): Promise<void> {
  await setDoc(doc(db, 'users', uid), dados)
}

export async function atualizarUltimoLogin(uid: string): Promise<void> {
  await setDoc(doc(db, 'users', uid), { ultimoLogin: Date.now() }, { merge: true })
}

interface AuthContext {
  uid: string
  nome: string
}

/** Cria um novo utilizador (Auth + perfil) sem afetar a sessão atual do administrador. */
export async function criarUtilizador(
  nome: string,
  email: string,
  password: string,
  papel: UserRole,
  autor: AuthContext,
): Promise<string> {
  const authSecundaria = obterAuthSecundaria()
  const cred = await createUserWithEmailAndPassword(authSecundaria, email, password)
  await updateProfile(cred.user, { displayName: nome })

  const novoPerfil: Omit<AppUser, 'id'> = {
    nome,
    email,
    papel,
    ativo: true,
    criadoEm: Date.now(),
  }
  await criarPerfilUtilizador(cred.user.uid, novoPerfil)
  await signOut(authSecundaria)

  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'criar',
    coleccao: 'users',
    documentoId: cred.user.uid,
    valorNovo: novoPerfil,
  })

  return cred.user.uid
}

export async function atualizarUtilizador(
  uid: string,
  dados: Partial<Pick<AppUser, 'nome' | 'papel' | 'ativo'>>,
  autor: AuthContext,
  valorAnterior?: AppUser,
): Promise<void> {
  await setDoc(doc(db, 'users', uid), dados, { merge: true })
  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'atualizar',
    coleccao: 'users',
    documentoId: uid,
    valorAnterior,
    valorNovo: dados,
  })
}
