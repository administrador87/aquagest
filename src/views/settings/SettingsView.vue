<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { redimensionarImagemParaIcone } from '@/utils/imageResize'
import type { MetodoPagamentoInfo } from '@/types/models'
import Card from '@/components/ui/Card.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'

const store = useSettingsStore()

type ChaveMetodo = 'metodoMpesa' | 'metodoEmola' | 'metodoTransferencia' | 'metodoOutro'

const METODOS_CONFIGURAVEIS: { chave: ChaveMetodo; label: string }[] = [
  { chave: 'metodoMpesa', label: 'M-Pesa' },
  { chave: 'metodoEmola', label: 'E-Mola' },
  { chave: 'metodoTransferencia', label: 'Transferência Bancária' },
  { chave: 'metodoOutro', label: 'Outro' },
]

function metodoVazio(): MetodoPagamentoInfo {
  return { ativo: true, numero: '', icone: '' }
}

const form = reactive({
  nomeEmpresa: '',
  nuit: '',
  endereco: '',
  telefone: '',
  email: '',
  moedaCodigo: '',
  moedaSimbolo: '',
  prefixoFatura: '',
  prefixoRecibo: '',
  prefixoPedido: '',
  diasVencimentoFatura: 15,
  codigoPaisWhatsapp: '258',
  banco: '',
  numeroConta: '',
  nib: '',
  metodoMpesa: metodoVazio(),
  metodoEmola: metodoVazio(),
  metodoTransferencia: metodoVazio(),
  metodoOutro: metodoVazio(),
})

const erroIcone = reactive({ mensagem: '' })

async function carregarIcone(chave: ChaveMetodo, evento: Event) {
  const alvo = evento.target as HTMLInputElement
  const ficheiro = alvo.files?.[0]
  if (!ficheiro) return
  erroIcone.mensagem = ''
  try {
    form[chave].icone = await redimensionarImagemParaIcone(ficheiro)
  } catch (e) {
    erroIcone.mensagem = e instanceof Error ? e.message : 'Não foi possível carregar a imagem.'
  } finally {
    alvo.value = ''
  }
}

function removerIcone(chave: ChaveMetodo) {
  form[chave].icone = ''
}

function preencherDoStore() {
  Object.assign(form, store.dados)
  for (const { chave } of METODOS_CONFIGURAVEIS) {
    if (!form[chave]) form[chave] = metodoVazio()
  }
}

onMounted(async () => {
  if (!store.carregado) await store.carregar()
  preencherDoStore()
})
watch(() => store.dados, preencherDoStore, { deep: true })

const aGuardar = reactive({ valor: false })
const guardado = reactive({ valor: false })

async function guardar() {
  aGuardar.valor = true
  guardado.valor = false
  try {
    await store.atualizar({ ...form, diasVencimentoFatura: Number(form.diasVencimentoFatura) })
    guardado.valor = true
    setTimeout(() => (guardado.valor = false), 3000)
  } finally {
    aGuardar.valor = false
  }
}
</script>

<template>
  <div>
    <h1 class="mb-6 text-2xl font-bold text-[hsl(var(--foreground))]">Configurações</h1>

    <Card class="max-w-2xl p-5">
      <h2 class="mb-4 text-sm font-semibold">Dados da Empresa</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div class="sm:col-span-2">
          <Label for="nomeEmpresa">Nome da empresa</Label>
          <Input id="nomeEmpresa" v-model="form.nomeEmpresa" />
        </div>
        <div>
          <Label for="nuit">NUIT</Label>
          <Input id="nuit" v-model="form.nuit" />
        </div>
        <div>
          <Label for="telefone">Telefone</Label>
          <Input id="telefone" v-model="form.telefone" />
        </div>
        <div class="sm:col-span-2">
          <Label for="endereco">Endereço</Label>
          <Input id="endereco" v-model="form.endereco" />
        </div>
        <div class="sm:col-span-2">
          <Label for="email">Email</Label>
          <Input id="email" v-model="form.email" type="email" />
        </div>
      </div>

      <h2 class="mb-4 mt-6 text-sm font-semibold">Moeda</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="moedaCodigo">Código (ISO)</Label>
          <Input id="moedaCodigo" v-model="form.moedaCodigo" placeholder="MZN" />
        </div>
        <div>
          <Label for="moedaSimbolo">Símbolo</Label>
          <Input id="moedaSimbolo" v-model="form.moedaSimbolo" placeholder="MT" />
        </div>
      </div>

      <h2 class="mb-4 mt-6 text-sm font-semibold">WhatsApp</h2>
      <div class="grid grid-cols-2 gap-4">
        <div>
          <Label for="codigoPaisWhatsapp">Código do país (sem +)</Label>
          <Input id="codigoPaisWhatsapp" v-model="form.codigoPaisWhatsapp" placeholder="258" />
          <p class="mt-1 text-xs text-[hsl(var(--muted-foreground))]">
            Usado para completar os números de telefone dos clientes ao enviar faturas/recibos por WhatsApp.
          </p>
        </div>
      </div>

      <h2 class="mb-4 mt-6 text-sm font-semibold">Dados Bancários (aparecem na factura/recibo)</h2>
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <Label for="banco">Banco</Label>
          <Input id="banco" v-model="form.banco" placeholder="BCI - Banco Comercial e de Investimentos" />
        </div>
        <div>
          <Label for="numeroConta">Número de Conta</Label>
          <Input id="numeroConta" v-model="form.numeroConta" />
        </div>
        <div>
          <Label for="nib">NIB</Label>
          <Input id="nib" v-model="form.nib" />
        </div>
      </div>

      <h2 class="mb-1 mt-6 text-sm font-semibold">Métodos de Pagamento</h2>
      <p class="mb-3 text-xs text-[hsl(var(--muted-foreground))]">
        Desative um método para deixar de aparecer na factura/recibo (ex: se não usa "Outro"). O número/referência e o
        ícone aparecem no documento e na página aberta pelo QR Code.
      </p>
      <p v-if="erroIcone.mensagem" class="mb-3 rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-xs text-[hsl(var(--destructive))]">
        {{ erroIcone.mensagem }}
      </p>
      <div class="space-y-3">
        <div v-for="metodo in METODOS_CONFIGURAVEIS" :key="metodo.chave" class="rounded-md border border-[hsl(var(--border))] p-3">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <label class="flex items-center gap-2 text-sm font-medium">
              <input v-model="form[metodo.chave].ativo" type="checkbox" class="h-4 w-4 rounded border-[hsl(var(--border))]" />
              {{ metodo.label }}
            </label>
            <div class="flex items-center gap-2">
              <img
                v-if="form[metodo.chave].icone"
                :src="form[metodo.chave].icone"
                class="h-8 w-8 rounded-full border border-[hsl(var(--border))] object-cover"
              />
              <button
                v-if="form[metodo.chave].icone"
                type="button"
                class="text-xs text-[hsl(var(--destructive))] hover:underline"
                @click="removerIcone(metodo.chave)"
              >
                Remover ícone
              </button>
              <label class="cursor-pointer rounded-md border border-[hsl(var(--border))] px-2 py-1.5 text-xs hover:bg-[hsl(var(--accent))]">
                Carregar ícone
                <input type="file" accept="image/*" class="hidden" @change="carregarIcone(metodo.chave, $event)" />
              </label>
            </div>
          </div>
          <div class="mt-2 max-w-xs">
            <Input v-model="form[metodo.chave].numero" placeholder="Número / referência (ex: 84 123 4567)" />
          </div>
        </div>
      </div>

      <h2 class="mb-4 mt-6 text-sm font-semibold">Numeração e Faturação</h2>
      <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <Label for="prefixoFatura">Prefixo faturas</Label>
          <Input id="prefixoFatura" v-model="form.prefixoFatura" />
        </div>
        <div>
          <Label for="prefixoRecibo">Prefixo recibos</Label>
          <Input id="prefixoRecibo" v-model="form.prefixoRecibo" />
        </div>
        <div>
          <Label for="prefixoPedido">Prefixo pedidos</Label>
          <Input id="prefixoPedido" v-model="form.prefixoPedido" />
        </div>
        <div>
          <Label for="diasVencimentoFatura">Dias até vencimento</Label>
          <Input id="diasVencimentoFatura" v-model.number="form.diasVencimentoFatura" type="number" min="1" />
        </div>
      </div>

      <div class="mt-6 flex items-center gap-3">
        <Button :disabled="aGuardar.valor" @click="guardar">{{ aGuardar.valor ? 'A guardar…' : 'Guardar Configurações' }}</Button>
        <span v-if="guardado.valor" class="text-sm text-[hsl(var(--success))]">Guardado com sucesso.</span>
      </div>
    </Card>
  </div>
</template>
