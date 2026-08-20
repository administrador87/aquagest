// Modelos de dados das coleções Firestore.
// Datas são guardadas como Firestore Timestamp, mas expostas na app como number (epoch ms)
// através dos converters em `src/firebase/converters.ts`.

export type UserRole = 'admin' | 'gestor' | 'tecnico' | 'operador'

export interface AppUser {
  id: string // = uid do Firebase Auth
  nome: string
  email: string
  papel: UserRole
  ativo: boolean
  criadoEm: number
  ultimoLogin?: number
}

export type CustomerStatus = 'ativo' | 'inativo'
export type CustomerType = 'domestico' | 'comercial' | 'industrial' | 'publico'

export interface Customer {
  id: string
  codigo: string
  nome: string
  documento: string
  telefone: string
  email?: string
  endereco: string
  bairro: string
  zona: string
  tipo: CustomerType
  dataCadastro: number
  estado: CustomerStatus
  observacoes?: string
  saldoAtual: number // positivo = dívida, negativo = crédito
  criadoEm: number
  atualizadoEm: number
}

export type ConnectionStatus =
  | 'pedido'
  | 'em_analise'
  | 'aprovado'
  | 'aguardando_pagamento'
  | 'em_instalacao'
  | 'instalado'
  | 'cancelado'

export interface Connection {
  id: string
  numeroPedido: string
  clienteId?: string // preenchido depois de convertido em cliente
  nomeSolicitante: string
  documentoSolicitante: string
  telefoneSolicitante: string
  dataPedido: number
  endereco: string
  bairro: string
  zona: string
  tipoLigacao: string
  tipoCliente: CustomerType
  estado: ConnectionStatus
  taxaLigacao: number
  valorPago: number
  valorPendente: number
  dataPrevistaInstalacao?: number
  dataInstalacao?: number
  contadorInstaladoId?: string
  observacoes?: string
  criadoEm: number
  atualizadoEm: number
}

export type MeterStatus = 'ativo' | 'substituido' | 'avariado' | 'removido'

export interface Meter {
  id: string
  numero: string
  clienteId: string
  numeroSerie: string
  marca: string
  modelo: string
  dataInstalacao: number
  leituraInicial: number
  estado: MeterStatus
  localizacao?: string
  observacoes?: string
  substitui?: string // id do contador anterior
  substituidoPor?: string // id do contador novo
  criadoEm: number
  atualizadoEm: number
}

export interface MeterReading {
  id: string
  clienteId: string
  contadorId: string
  data: number
  leituraAnterior: number
  leituraAtual: number
  consumo: number
  leitorId: string
  leitorNome: string
  fotoUrl?: string
  corrigida: boolean
  motivoCorrecao?: string
  observacoes?: string
  faturada: boolean
  criadoEm: number
  atualizadoEm: number
}

export interface TariffBand {
  deM3: number
  ateM3: number | null // null = sem limite superior
  precoM3: number
}

export interface Tariff {
  id: string
  nome: string
  validoDesde: number
  validoAte: number | null // null = tarifa atual
  escaloes: TariffBand[]
  taxaFixa: number
  taxaManutencao: number
  outrasTaxas: { nome: string; valor: number }[]
  impostoPercentagem: number
  ativa: boolean
  criadoEm: number
}

export type InvoiceStatus =
  | 'rascunho'
  | 'emitida'
  | 'paga'
  | 'parcialmente_paga'
  | 'pendente'
  | 'vencida'
  | 'cancelada'

export interface InvoiceLine {
  descricao: string
  quantidade: number
  valorUnitario: number
  total: number
}

export interface Invoice {
  id: string
  numero: string
  clienteId: string
  periodoInicio: number
  periodoFim: number
  leituraId?: string
  leituraAnterior: number
  leituraAtual: number
  consumo: number
  tarifaId: string
  tarifaSnapshot: Pick<Tariff, 'escaloes' | 'taxaFixa' | 'taxaManutencao' | 'outrasTaxas' | 'impostoPercentagem'>
  linhas: InvoiceLine[]
  subtotal: number
  impostoValor: number
  total: number
  totalPago: number
  dataEmissao: number
  dataVencimento: number
  estado: InvoiceStatus
  observacoes?: string
  criadoPor: string
  criadoEm: number
  atualizadoEm: number
}

export type PaymentMethod = 'dinheiro' | 'transferencia' | 'mpesa' | 'emola' | 'outro'

export interface Payment {
  id: string
  clienteId: string
  faturaIds: string[]
  data: number
  valor: number
  metodo: PaymentMethod
  referencia?: string
  operadorId: string
  operadorNome: string
  observacoes?: string
  criadoEm: number
}

export interface Receipt {
  id: string
  numero: string
  clienteId: string
  pagamentoId: string
  faturaIds: string[]
  valorRecebido: number
  metodo: PaymentMethod
  data: number
  operadorId: string
  operadorNome: string
  saldoRestante: number
  criadoEm: number
}

export type TransactionType = 'debito' | 'credito'

export interface FinancialTransaction {
  id: string
  clienteId: string
  tipo: TransactionType // debito = fatura emitida, credito = pagamento recebido
  origem: 'fatura' | 'pagamento' | 'ajuste'
  origemId: string
  descricao: string
  valor: number
  saldoAposMovimento: number
  data: number
  criadoEm: number
}

export interface AuditLog {
  id: string
  utilizadorId: string
  utilizadorNome: string
  operacao: 'criar' | 'atualizar' | 'eliminar'
  coleccao: string
  documentoId: string
  valorAnterior?: unknown
  valorNovo?: unknown
  timestamp: number
}

export interface AppSettings {
  id: string
  nomeEmpresa: string
  nuit?: string
  endereco?: string
  telefone?: string
  email?: string
  moedaCodigo: string
  moedaSimbolo: string
  prefixoFatura: string
  prefixoRecibo: string
  prefixoPedido: string
  diasVencimentoFatura: number
  atualizadoEm: number
}

export interface Counter {
  id: string
  ultimoNumero: number
  ano: number
}
