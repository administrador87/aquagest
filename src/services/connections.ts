import { doc, writeBatch } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { createCollectionService } from '@/services/firestoreService'
import { customersService } from '@/services/customers'
import { metersService } from '@/services/meters'
import { gerarNumeroSequencial } from '@/services/numbering'
import { registarAuditoria } from '@/services/auditLog'
import { removerUndefined } from '@/utils/firestoreSanitize'
import { round2 } from '@/utils/calculations'
import type { Connection, ConnectionStatus, Customer, Meter } from '@/types/models'

export const connectionsService = createCollectionService<Connection>('connections')

interface AuthContext {
  uid: string
  nome: string
}

export async function criarPedidoLigacao(
  dados: Omit<Connection, 'id' | 'criadoEm' | 'atualizadoEm' | 'numeroPedido' | 'estado' | 'valorPendente'>,
  autor: AuthContext,
  prefixoPedido: string,
): Promise<string> {
  const numeroPedido = await gerarNumeroSequencial('connection', prefixoPedido)
  return connectionsService.criar(
    {
      ...dados,
      numeroPedido,
      estado: 'pedido',
      valorPendente: round2(dados.taxaLigacao - dados.valorPago),
    },
    autor,
  )
}

export async function atualizarEstadoLigacao(
  connectionId: string,
  novoEstado: ConnectionStatus,
  autor: AuthContext,
): Promise<void> {
  const anterior = await connectionsService.obter(connectionId)
  await connectionsService.atualizar(connectionId, { estado: novoEstado }, autor, anterior)
}

interface DadosContadorInstalacao {
  numero: string
  numeroSerie: string
  marca: string
  modelo: string
  leituraInicial: number
  localizacao?: string
}

/**
 * Conclui a instalação de um pedido de ligação: cria o cliente e o contador associado, e marca
 * o pedido como instalado, tudo numa única escrita em lote atómica.
 */
export async function concluirInstalacaoEConverterCliente(
  connectionId: string,
  contador: DadosContadorInstalacao,
  autor: AuthContext,
): Promise<{ clienteId: string; contadorId: string }> {
  const pedido = await connectionsService.obter(connectionId)
  if (!pedido) throw new Error('Pedido de ligação não encontrado.')
  if (pedido.estado === 'instalado') throw new Error('Este pedido já foi instalado.')

  const ano = new Date().getFullYear()
  const todos = await customersService.listar()
  const doAno = todos.filter((c) => c.codigo?.startsWith(`CL-${ano}-`))
  const codigo = `CL-${ano}-${String(doAno.length + 1).padStart(5, '0')}`

  const agora = Date.now()
  const clienteRef = doc(customersService.colRef)
  const meterRef = doc(metersService.colRef)

  const customerData: Omit<Customer, 'id'> = {
    codigo,
    nome: pedido.nomeSolicitante,
    documento: pedido.documentoSolicitante,
    telefone: pedido.telefoneSolicitante,
    endereco: pedido.endereco,
    bairro: pedido.bairro,
    zona: pedido.zona,
    tipo: pedido.tipoCliente,
    dataCadastro: agora,
    estado: 'ativo',
    saldoAtual: 0,
    criadoEm: agora,
    atualizadoEm: agora,
  }

  const meterData: Omit<Meter, 'id'> = {
    numero: contador.numero,
    clienteId: clienteRef.id,
    numeroSerie: contador.numeroSerie,
    marca: contador.marca,
    modelo: contador.modelo,
    dataInstalacao: agora,
    leituraInicial: contador.leituraInicial,
    estado: 'ativo',
    localizacao: contador.localizacao,
    criadoEm: agora,
    atualizadoEm: agora,
  }

  const batch = writeBatch(db)
  batch.set(clienteRef, removerUndefined(customerData))
  batch.set(meterRef, removerUndefined(meterData))
  batch.update(doc(db, 'connections', connectionId), {
    estado: 'instalado',
    dataInstalacao: agora,
    contadorInstaladoId: meterRef.id,
    clienteId: clienteRef.id,
    atualizadoEm: agora,
  })
  await batch.commit()

  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'criar',
    coleccao: 'customers',
    documentoId: clienteRef.id,
    valorNovo: customerData,
  })
  await registarAuditoria({
    utilizadorId: autor.uid,
    utilizadorNome: autor.nome,
    operacao: 'atualizar',
    coleccao: 'connections',
    documentoId: connectionId,
    valorAnterior: pedido,
    valorNovo: { ...pedido, estado: 'instalado' },
  })

  return { clienteId: clienteRef.id, contadorId: meterRef.id }
}
