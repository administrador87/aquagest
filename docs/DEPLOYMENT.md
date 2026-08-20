# Guia de Instalação e Deployment — AquaGest

Este guia explica, passo a passo, como instalar as ferramentas necessárias, criar o projeto
Firebase, ligar o GitHub e publicar a aplicação AquaGest. Os comandos de terminal assumem Windows
com PowerShell, mas funcionam de forma equivalente em macOS/Linux (bash).

## Índice

1. [Instalar o Node.js](#1-instalar-o-nodejs)
2. [Instalar o Firebase CLI](#2-instalar-o-firebase-cli)
3. [Criar o projeto Firebase](#3-criar-o-projeto-firebase)
4. [Ativar o Firebase Authentication](#4-ativar-o-firebase-authentication)
5. [Criar a base de dados Firestore](#5-criar-a-base-de-dados-firestore)
6. [Registar a app Web no Firebase](#6-registar-a-app-web-no-firebase)
7. [Configurar as variáveis de ambiente](#7-configurar-as-variáveis-de-ambiente)
8. [Configurar as regras do Firestore](#8-configurar-as-regras-do-firestore)
9. [Configurar o Firebase Hosting](#9-configurar-o-firebase-hosting)
10. [Ligar o projeto ao GitHub](#10-ligar-o-projeto-ao-github)
11. [Primeiro deployment](#11-primeiro-deployment)
12. [Atualizar a aplicação posteriormente](#12-atualizar-a-aplicação-posteriormente)
13. [Depois do primeiro administrador](#13-depois-do-primeiro-administrador)
14. [Testar localmente com emuladores (opcional)](#14-testar-localmente-com-emuladores-opcional)

---

## 1. Instalar o Node.js

O AquaGest é construído com Vite + Vue 3, que precisam do Node.js (versão 20 ou superior).

1. Aceda a [nodejs.org](https://nodejs.org) e descarregue o instalador **LTS** para o seu sistema
   operativo.
2. Execute o instalador com as opções por defeito (inclui npm e a opção "Add to PATH").
3. Feche e reabra o terminal.
4. Confirme a instalação:

```bash
node -v
npm -v
```

Deve ver algo como `v20.x.x` (ou superior) e `10.x.x`.

## 2. Instalar o Firebase CLI

O Firebase CLI é a ferramenta de linha de comandos usada para criar recursos, testar localmente e
publicar a aplicação.

```bash
npm install -g firebase-tools
```

Confirme a instalação e inicie sessão com a sua conta Google:

```bash
firebase --version
firebase login
```

O comando `firebase login` abre o browser para autenticação. Se estiver num ambiente sem browser
(ex: servidor remoto), use `firebase login --no-localhost`.

## 3. Criar o projeto Firebase

1. Aceda a [console.firebase.google.com](https://console.firebase.google.com).
2. Clique em **Adicionar projeto** (Add project).
3. Dê um nome ao projeto (ex: `aquagest-suaempresa`) e siga o assistente (pode desativar o Google
   Analytics se não precisar).
4. Anote o **ID do projeto** gerado (ex: `aquagest-suaempresa-a1b2c`) — vai precisar dele nos
   passos seguintes.

Alternativamente, pode criar o projeto diretamente pelo terminal:

```bash
firebase projects:create aquagest-suaempresa --display-name "AquaGest"
```

## 4. Ativar o Firebase Authentication

1. No [Firebase Console](https://console.firebase.google.com), abra o seu projeto.
2. No menu lateral, vá a **Build → Authentication**.
3. Clique em **Get started**.
4. Na aba **Sign-in method**, ative o fornecedor **Email/Password** (Email/Palavra-passe).

Não é necessário criar utilizadores aqui — a própria aplicação cria o primeiro administrador no
primeiro arranque (ver secção 11).

## 5. Criar a base de dados Firestore

1. No Firebase Console, vá a **Build → Firestore Database**.
2. Clique em **Create database**.
3. Escolha o modo **Production** (as regras de segurança do projeto, em `firestore.rules`, já
   protegem os dados adequadamente).
4. Escolha a localização do servidor mais próxima dos seus utilizadores (ex: `europe-west1` para
   Europa/África). **Esta escolha é definitiva e não pode ser alterada depois.**

## 6. Registar a app Web no Firebase

1. No Firebase Console, na página inicial do projeto, clique no ícone **`</>`** ("Web") para
   adicionar uma app Web.
2. Dê um nome à app (ex: "AquaGest Web") — **não** é necessário ativar o Firebase Hosting neste
   passo (fazemo-lo na secção 9).
3. O Firebase mostra um bloco de configuração `firebaseConfig` com valores como `apiKey`,
   `authDomain`, `projectId`, etc. **Guarde estes valores** — vai precisar deles no próximo passo.

## 7. Configurar as variáveis de ambiente

Na raiz do projeto, copie o ficheiro de exemplo:

```bash
cp .env.example .env
```

(No Windows PowerShell: `Copy-Item .env.example .env`)

Abra o `.env` e preencha com os valores obtidos no passo 6:

```env
VITE_FIREBASE_API_KEY=cole_aqui_o_apiKey
VITE_FIREBASE_AUTH_DOMAIN=cole_aqui_o_authDomain
VITE_FIREBASE_PROJECT_ID=cole_aqui_o_projectId
VITE_FIREBASE_STORAGE_BUCKET=cole_aqui_o_storageBucket
VITE_FIREBASE_MESSAGING_SENDER_ID=cole_aqui_o_messagingSenderId
VITE_FIREBASE_APP_ID=cole_aqui_o_appId

VITE_DEFAULT_CURRENCY_CODE=MZN
VITE_DEFAULT_CURRENCY_SYMBOL=MT
```

O `.env` nunca é enviado para o GitHub (está no `.gitignore`) — cada pessoa/ambiente configura o
seu próprio.

Instale as dependências do projeto:

```bash
npm install
```

## 8. Configurar as regras do Firestore

O projeto já inclui `firestore.rules` (regras de segurança) e `firestore.indexes.json` (índices
compostos necessários pelas consultas da aplicação). Associe o CLI ao seu projeto Firebase:

```bash
firebase use --add
```

Escolha o projeto criado na secção 3 e dê-lhe o alias `default` quando pedido. Isto atualiza o
ficheiro `.firebaserc` (substitua o valor de demonstração `demo-aquagest` que lá está).

Publique as regras e os índices:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 9. Configurar o Firebase Hosting

O ficheiro `firebase.json` já está configurado para publicar a pasta `dist` (gerada pelo build) e
para reescrever todas as rotas para `index.html` (necessário para o Vue Router funcionar em modo
"history"). Não é preciso correr `firebase init hosting` — já está pronto.

## 10. Ligar o projeto ao GitHub

Se o projeto ainda não é um repositório Git:

```bash
git init
git add .
git commit -m "Primeira versão do AquaGest"
```

Crie um repositório novo em [github.com/new](https://github.com/new) (sem inicializar com README,
para evitar conflitos) e ligue-o:

```bash
git remote add origin https://github.com/SEU-UTILIZADOR/SEU-REPOSITORIO.git
git branch -M main
git push -u origin main
```

## 11. Primeiro deployment

Construa a aplicação para produção:

```bash
npm run build
```

Isto gera a pasta `dist/`. Publique no Firebase Hosting:

```bash
firebase deploy --only hosting
```

No final, o terminal mostra o URL público (algo como
`https://aquagest-suaempresa.web.app`). Abra-o no browser.

**Crie o primeiro administrador:**

1. Na página de login, clique em **"Primeira utilização? Criar conta de administrador"**.
2. Preencha o seu nome, email e palavra-passe, mantenha o papel **Administrador** e submeta.
3. É criada a sua conta e sessão iniciada automaticamente — está pronto a configurar o resto (ver
   secção 13, importante para a segurança).

## 12. Atualizar a aplicação posteriormente

Sempre que fizer alterações ao código:

```bash
git add .
git commit -m "Descrição da alteração"
git push

npm run build
firebase deploy --only hosting
```

Se também alterou `firestore.rules` ou `firestore.indexes.json`:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

Ou tudo de uma vez:

```bash
firebase deploy
```

## 13. Depois do primeiro administrador

**Passo de segurança importante.** As regras do Firestore (`firestore.rules`) permitem, por
predefinição, que qualquer pessoa com o URL da aplicação se registe como administrador — isto é
necessário para o primeiro arranque, mas deve ser desativado logo a seguir.

Abra `firestore.rules`, encontre a secção `--- users ---` e altere a linha:

```
allow create: if temPapel(['admin']) || (request.auth != null && request.auth.uid == uid);
```

para (remove o auto-registo, mantendo apenas a criação por um administrador via o módulo
Utilizadores):

```
allow create: if temPapel(['admin']);
```

Depois publique a alteração:

```bash
firebase deploy --only firestore:rules
```

A partir daqui, novos utilizadores só podem ser criados por um administrador a partir do módulo
**Utilizadores** dentro da aplicação.

## 14. Testar localmente com emuladores (opcional)

Para desenvolver ou testar sem afetar os dados de produção, use os emuladores locais do Firebase
(precisam de **Java 21 ou superior** instalado — descarregue em
[adoptium.net](https://adoptium.net) se necessário):

```bash
firebase emulators:start --only auth,firestore
```

Num segundo terminal, ative o modo de emuladores no `.env` local:

```env
VITE_USE_FIREBASE_EMULATORS=true
```

E arranque o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação liga-se aos emuladores (dados de teste, isolados, sem custos) em vez do projeto
Firebase real. O painel dos emuladores fica disponível em `http://127.0.0.1:4000`.

---

## Instalar como PWA

Depois de publicada, a aplicação pode ser instalada como app:

- **No computador (Chrome/Edge):** ícone de instalação na barra de endereço, ou menu → "Instalar
  AquaGest".
- **No Android (Chrome):** menu → "Instalar aplicação" ou "Adicionar ao ecrã principal".
- **No iPhone (Safari):** botão Partilhar → "Adicionar ao ecrã principal".

## Funcionamento offline

A aplicação guarda os dados numa cache local persistente (IndexedDB) e sincroniza automaticamente
quando a ligação à Internet é restabelecida. O indicador **ONLINE/OFFLINE** e o contador de
operações por sincronizar aparecem sempre visíveis no topo da aplicação.
