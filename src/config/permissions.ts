import type { UserRole } from '@/types/models'

export type Module =
  | 'dashboard'
  | 'customers'
  | 'connections'
  | 'meters'
  | 'readings'
  | 'tariffs'
  | 'invoices'
  | 'payments'
  | 'receipts'
  | 'debts'
  | 'reports'
  | 'users'
  | 'settings'
  | 'audit'

export type Action = 'view' | 'create' | 'edit' | 'delete' | 'correct' | 'manage'

// Matriz de permissões: para cada módulo, quais papéis podem executar cada ação.
// Um papel ausente numa ação = não autorizado.
const MATRIZ: Record<Module, Partial<Record<Action, UserRole[]>>> = {
  dashboard: { view: ['admin', 'gestor', 'tecnico', 'operador'] },
  customers: {
    view: ['admin', 'gestor', 'tecnico', 'operador'],
    create: ['admin', 'gestor', 'operador'],
    edit: ['admin', 'gestor', 'operador'],
    delete: ['admin'],
  },
  connections: {
    view: ['admin', 'gestor', 'operador'],
    create: ['admin', 'gestor', 'operador'],
    edit: ['admin', 'gestor', 'operador'],
    delete: ['admin'],
  },
  meters: {
    view: ['admin', 'gestor', 'tecnico', 'operador'],
    create: ['admin', 'gestor', 'tecnico'],
    edit: ['admin', 'gestor', 'tecnico'],
    delete: ['admin'],
  },
  readings: {
    view: ['admin', 'gestor', 'tecnico', 'operador'],
    create: ['admin', 'gestor', 'tecnico'],
    correct: ['admin', 'gestor'],
  },
  tariffs: { view: ['admin', 'gestor', 'operador'], create: ['admin'], edit: ['admin'], delete: ['admin'] },
  invoices: {
    view: ['admin', 'gestor', 'operador'],
    create: ['admin', 'gestor', 'operador'],
    edit: ['admin', 'gestor'],
    delete: ['admin'],
  },
  payments: { view: ['admin', 'gestor', 'operador'], create: ['admin', 'gestor', 'operador'] },
  receipts: { view: ['admin', 'gestor', 'operador'] },
  debts: { view: ['admin', 'gestor', 'operador'] },
  reports: { view: ['admin', 'gestor', 'operador'] },
  users: { view: ['admin'], create: ['admin'], edit: ['admin'], delete: ['admin'] },
  settings: { view: ['admin'], manage: ['admin'] },
  audit: { view: ['admin', 'gestor'] },
}

export function podeExecutar(papel: UserRole | undefined, modulo: Module, accao: Action): boolean {
  if (!papel) return false
  return MATRIZ[modulo]?.[accao]?.includes(papel) ?? false
}

export const MENU_ITENS: { modulo: Module; label: string; rota: string; icon: string }[] = [
  { modulo: 'dashboard', label: 'Dashboard', rota: '/', icon: 'LayoutDashboard' },
  { modulo: 'customers', label: 'Clientes', rota: '/clientes', icon: 'Users' },
  { modulo: 'connections', label: 'Novas Ligações', rota: '/ligacoes', icon: 'PlugZap' },
  { modulo: 'meters', label: 'Contadores', rota: '/contadores', icon: 'Gauge' },
  { modulo: 'readings', label: 'Leituras', rota: '/leituras', icon: 'ClipboardList' },
  { modulo: 'invoices', label: 'Faturação', rota: '/faturas', icon: 'FileText' },
  { modulo: 'payments', label: 'Pagamentos', rota: '/pagamentos', icon: 'CreditCard' },
  { modulo: 'receipts', label: 'Recibos', rota: '/recibos', icon: 'Receipt' },
  { modulo: 'debts', label: 'Dívidas', rota: '/dividas', icon: 'AlertTriangle' },
  { modulo: 'reports', label: 'Relatórios', rota: '/relatorios', icon: 'BarChart3' },
  { modulo: 'tariffs', label: 'Tarifas', rota: '/tarifas', icon: 'Percent' },
  { modulo: 'users', label: 'Utilizadores', rota: '/utilizadores', icon: 'UserCog' },
  { modulo: 'settings', label: 'Configurações', rota: '/configuracoes', icon: 'Settings' },
]
