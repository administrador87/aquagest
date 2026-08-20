<script setup lang="ts">
import { reactive } from 'vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Button from '@/components/ui/Button.vue'
import type { Connection, CustomerType } from '@/types/models'

const props = defineProps<{ aGuardar: boolean }>()
const emit = defineEmits<{
  submeter: [dados: Omit<Connection, 'id' | 'criadoEm' | 'atualizadoEm' | 'numeroPedido' | 'estado' | 'valorPendente'>]
  cancelar: []
}>()

const TIPOS_CLIENTE: { value: CustomerType; label: string }[] = [
  { value: 'domestico', label: 'Doméstico' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'publico', label: 'Público' },
]

const form = reactive({
  nomeSolicitante: '',
  documentoSolicitante: '',
  telefoneSolicitante: '',
  dataPedido: new Date().toISOString().slice(0, 10),
  endereco: '',
  bairro: '',
  zona: '',
  tipoLigacao: 'Nova ligação domiciliária',
  tipoCliente: 'domestico' as CustomerType,
  taxaLigacao: 0,
  valorPago: 0,
  dataPrevistaInstalacao: '',
  observacoes: '',
})

const erro = reactive({ mensagem: '' })

function submeter() {
  erro.mensagem = ''
  if (!form.nomeSolicitante.trim() || !form.documentoSolicitante.trim() || !form.telefoneSolicitante.trim()) {
    erro.mensagem = 'Preencha os dados do solicitante.'
    return
  }
  if (!form.endereco.trim() || !form.bairro.trim() || !form.zona.trim()) {
    erro.mensagem = 'Preencha o endereço completo.'
    return
  }

  emit('submeter', {
    nomeSolicitante: form.nomeSolicitante,
    documentoSolicitante: form.documentoSolicitante,
    telefoneSolicitante: form.telefoneSolicitante,
    dataPedido: new Date(form.dataPedido).getTime(),
    endereco: form.endereco,
    bairro: form.bairro,
    zona: form.zona,
    tipoLigacao: form.tipoLigacao,
    tipoCliente: form.tipoCliente,
    taxaLigacao: Number(form.taxaLigacao),
    valorPago: Number(form.valorPago),
    dataPrevistaInstalacao: form.dataPrevistaInstalacao ? new Date(form.dataPrevistaInstalacao).getTime() : undefined,
    observacoes: form.observacoes || undefined,
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submeter">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label for="nomeSolicitante">Nome do solicitante</Label>
        <Input id="nomeSolicitante" v-model="form.nomeSolicitante" />
      </div>
      <div>
        <Label for="documentoSolicitante">Documento</Label>
        <Input id="documentoSolicitante" v-model="form.documentoSolicitante" />
      </div>
      <div>
        <Label for="telefoneSolicitante">Telefone</Label>
        <Input id="telefoneSolicitante" v-model="form.telefoneSolicitante" />
      </div>
      <div>
        <Label for="dataPedido">Data do pedido</Label>
        <Input id="dataPedido" v-model="form.dataPedido" type="date" />
      </div>
      <div class="sm:col-span-2">
        <Label for="endereco">Endereço</Label>
        <Input id="endereco" v-model="form.endereco" />
      </div>
      <div>
        <Label for="bairro">Bairro</Label>
        <Input id="bairro" v-model="form.bairro" />
      </div>
      <div>
        <Label for="zona">Zona</Label>
        <Input id="zona" v-model="form.zona" />
      </div>
      <div>
        <Label for="tipoLigacao">Tipo de ligação</Label>
        <Input id="tipoLigacao" v-model="form.tipoLigacao" />
      </div>
      <div>
        <Label for="tipoCliente">Tipo de cliente</Label>
        <Select id="tipoCliente" v-model="form.tipoCliente" :options="TIPOS_CLIENTE" />
      </div>
      <div>
        <Label for="taxaLigacao">Taxa de ligação</Label>
        <Input id="taxaLigacao" v-model.number="form.taxaLigacao" type="number" min="0" step="0.01" />
      </div>
      <div>
        <Label for="valorPago">Valor já pago</Label>
        <Input id="valorPago" v-model.number="form.valorPago" type="number" min="0" step="0.01" />
      </div>
      <div class="sm:col-span-2">
        <Label for="dataPrevistaInstalacao">Data prevista de instalação (opcional)</Label>
        <Input id="dataPrevistaInstalacao" v-model="form.dataPrevistaInstalacao" type="date" />
      </div>
      <div class="sm:col-span-2">
        <Label for="observacoes">Observações</Label>
        <Textarea id="observacoes" v-model="form.observacoes" />
      </div>
    </div>

    <p v-if="erro.mensagem" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro.mensagem }}</p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="submit" :disabled="props.aGuardar">{{ props.aGuardar ? 'A guardar…' : 'Criar Pedido' }}</Button>
    </div>
  </form>
</template>
