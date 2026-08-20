# AquaGest — ERP de Gestão e Faturação de Água

Aplicação Web/PWA para gestão de clientes, contadores, leituras, tarifas, faturação, pagamentos,
recibos, dívidas e relatórios de uma empresa de fornecimento de água. Funciona online e offline,
com sincronização automática.

## Stack

Vue 3 + Vite + TypeScript · Pinia · Vue Router · Tailwind CSS + reka-ui · Firebase (Auth,
Firestore com cache offline, Hosting) · jsPDF · SheetJS (xlsx) · Chart.js

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # preencha com as credenciais do seu projeto Firebase
npm run dev
```

Para testar sem um projeto Firebase real, use os emuladores locais — ver
[docs/DEPLOYMENT.md, secção 14](docs/DEPLOYMENT.md#14-testar-localmente-com-emuladores-opcional).

## Deployment

Guia completo, passo a passo, com todos os comandos: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Estrutura do projeto

```
src/
  stores/        # estado global (Pinia) por módulo
  services/       # acesso ao Firestore + lógica de negócio (faturação, pagamentos, ligações…)
  components/     # componentes de UI, organizados por módulo
  views/          # páginas, uma por rota
  utils/          # cálculos, formatação, PDF, exportação de relatórios
firestore.rules            # regras de segurança
firestore.indexes.json     # índices compostos
docs/DEPLOYMENT.md         # guia de instalação e deployment
```
