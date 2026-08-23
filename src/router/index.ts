import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import type { Module } from '@/config/permissions'

const AppShell = () => import('@/components/layout/AppShell.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { publico: true },
    },
    {
      path: '/pagar',
      name: 'pagar',
      component: () => import('@/views/public/PublicPaymentView.vue'),
      meta: { publico: true },
    },
    {
      path: '/',
      component: AppShell,
      children: [
        {
          path: '',
          name: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
          meta: { modulo: 'dashboard' satisfies Module },
        },
        {
          path: 'clientes',
          name: 'clientes',
          component: () => import('@/views/customers/CustomersListView.vue'),
          meta: { modulo: 'customers' satisfies Module },
        },
        {
          path: 'clientes/:id',
          name: 'cliente-detalhe',
          component: () => import('@/views/customers/CustomerDetailView.vue'),
          meta: { modulo: 'customers' satisfies Module },
        },
        {
          path: 'contadores',
          name: 'contadores',
          component: () => import('@/views/meters/MetersListView.vue'),
          meta: { modulo: 'meters' satisfies Module },
        },
        {
          path: 'leituras',
          name: 'leituras',
          component: () => import('@/views/readings/ReadingsListView.vue'),
          meta: { modulo: 'readings' satisfies Module },
        },
        {
          path: 'ligacoes',
          name: 'ligacoes',
          component: () => import('@/views/connections/ConnectionsListView.vue'),
          meta: { modulo: 'connections' satisfies Module },
        },
        {
          path: 'faturas',
          name: 'faturas',
          component: () => import('@/views/invoices/InvoicesListView.vue'),
          meta: { modulo: 'invoices' satisfies Module },
        },
        {
          path: 'pagamentos',
          name: 'pagamentos',
          component: () => import('@/views/payments/PaymentsListView.vue'),
          meta: { modulo: 'payments' satisfies Module },
        },
        {
          path: 'recibos',
          name: 'recibos',
          component: () => import('@/views/receipts/ReceiptsListView.vue'),
          meta: { modulo: 'receipts' satisfies Module },
        },
        {
          path: 'dividas',
          name: 'dividas',
          component: () => import('@/views/debts/DebtsView.vue'),
          meta: { modulo: 'debts' satisfies Module },
        },
        {
          path: 'relatorios',
          name: 'relatorios',
          component: () => import('@/views/reports/ReportsView.vue'),
          meta: { modulo: 'reports' satisfies Module },
        },
        {
          path: 'tarifas',
          name: 'tarifas',
          component: () => import('@/views/tariffs/TariffsListView.vue'),
          meta: { modulo: 'tariffs' satisfies Module },
        },
        {
          path: 'utilizadores',
          name: 'utilizadores',
          component: () => import('@/views/users/UsersListView.vue'),
          meta: { modulo: 'users' satisfies Module },
        },
        {
          path: 'configuracoes',
          name: 'configuracoes',
          component: () => import('@/views/settings/SettingsView.vue'),
          meta: { modulo: 'settings' satisfies Module },
        },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()

  if (!auth.inicializado) {
    await auth.iniciar()
  }

  if (!auth.autenticado && !to.meta.publico) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (auth.autenticado && to.name === 'login') {
    return { path: '/' }
  }

  const modulo = to.meta.modulo as Module | undefined
  if (modulo && !auth.pode(modulo, 'view')) {
    return { path: '/' }
  }

  return true
})

export default router
