<script setup lang="ts">
import { onMounted, reactive, watch } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import Card from '@/components/ui/Card.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'

const store = useSettingsStore()

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
})

function preencherDoStore() {
  Object.assign(form, store.dados)
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
