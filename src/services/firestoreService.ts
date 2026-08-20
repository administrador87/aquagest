import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  QueryConstraint,
  updateDoc,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/firebase/config'
import { registarAuditoria } from '@/services/auditLog'
import { removerUndefined } from '@/utils/firestoreSanitize'

interface AuthContext {
  uid: string
  nome: string
}

/** Cria uma camada de serviço CRUD genérica para uma coleção, com auditoria automática. */
export function createCollectionService<T extends { id: string }>(nomeColeccao: string) {
  const colRef = collection(db, nomeColeccao)

  async function listar(...constraints: QueryConstraint[]): Promise<T[]> {
    const q = constraints.length ? query(colRef, ...constraints) : query(colRef, orderBy('criadoEm', 'desc'))
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T)
  }

  interface OuvirOpcoes {
    /** Quando definido, é chamado com o número de documentos ainda não sincronizados com o servidor. */
    aoContarPendentes?: (n: number) => void
  }

  function ouvir(
    callback: (items: T[]) => void,
    opcoes: OuvirOpcoes = {},
    ...constraints: QueryConstraint[]
  ): Unsubscribe {
    const q = constraints.length ? query(colRef, ...constraints) : query(colRef, orderBy('criadoEm', 'desc'))
    return onSnapshot(q, { includeMetadataChanges: !!opcoes.aoContarPendentes }, (snap) => {
      callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T))
      if (opcoes.aoContarPendentes) {
        opcoes.aoContarPendentes(snap.docs.filter((d) => d.metadata.hasPendingWrites).length)
      }
    })
  }

  async function obter(id: string): Promise<T | null> {
    const snap = await getDoc(doc(db, nomeColeccao, id))
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as T) : null
  }

  async function criar(dados: Omit<T, 'id' | 'criadoEm' | 'atualizadoEm'>, autor: AuthContext): Promise<string> {
    const agora = Date.now()
    const payload = removerUndefined({ ...dados, criadoEm: agora, atualizadoEm: agora })
    const ref = await addDoc(colRef, payload)
    await registarAuditoria({
      utilizadorId: autor.uid,
      utilizadorNome: autor.nome,
      operacao: 'criar',
      coleccao: nomeColeccao,
      documentoId: ref.id,
      valorNovo: payload,
    })
    return ref.id
  }

  async function atualizar(id: string, dados: Partial<T>, autor: AuthContext, valorAnterior?: unknown): Promise<void> {
    const payload = removerUndefined({ ...dados, atualizadoEm: Date.now() })
    await updateDoc(doc(db, nomeColeccao, id), payload)
    await registarAuditoria({
      utilizadorId: autor.uid,
      utilizadorNome: autor.nome,
      operacao: 'atualizar',
      coleccao: nomeColeccao,
      documentoId: id,
      valorAnterior,
      valorNovo: payload,
    })
  }

  async function remover(id: string, autor: AuthContext, valorAnterior?: unknown): Promise<void> {
    await deleteDoc(doc(db, nomeColeccao, id))
    await registarAuditoria({
      utilizadorId: autor.uid,
      utilizadorNome: autor.nome,
      operacao: 'eliminar',
      coleccao: nomeColeccao,
      documentoId: id,
      valorAnterior,
    })
  }

  return { colRef, listar, ouvir, obter, criar, atualizar, remover }
}
