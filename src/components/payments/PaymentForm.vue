<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useCustomersStore } from '@/stores/customers'
import Select from '@/components/ui/Select.vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Button from '@/components/ui/Button.vue'
import { formatCurrency } from '@/utils/currency'
import type { PaymentMethod } from '@/types/models'

const props = defineProps<{ clienteIdFixo?: string; aGuardar: boolean }>()
const emit = defineEmits<{
  submeter: [dados: { clienteId: string; valor: number; metodo: PaymentMethod; referencia?: string; observacoes?: string }]
  cancelar: []
}>()

const customersStore = useCustomersStore()

const clienteId = ref(props.clienteIdFixo ?? '')
const valor = ref<number>(0)
const metodo = ref<PaymentMethod>('dinheiro')
const referencia = ref('')
const observacoes = ref('')
const erro = reactive({ mensagem: '' })

const METODOS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'transferencia', label: 'Transferência Bancária' },
  { value: 'mpesa', label: 'M-Pesa' },
  { value: 'emola', label: 'E-Mola' },
  { value: 'outro', label: 'Outro' },
]

const opcoesClientes = computed(() => customersStore.itens.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nome}` })))
const clienteSelecionado = computed(() => customersStore.porId(clienteId.value))

function submeter() {
  erro.mensagem = ''
  if (!clienteId.value) {
    erro.mensagem = 'Selecione o cliente.'
    return
  }
  if (!valor.value || valor.value <= 0) {
    erro.mensagem = 'Indique um valor de pagamento válido.'
    return
  }
  emit('submeter', {
    clienteId: clienteId.value,
    valor: Number(valor.value),
    metodo: metodo.value,
    referencia: referencia.value || undefined,
    observacoes: observacoes.value || undefined,
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submeter">
    <div v-if="!clienteIdFixo">
      <Label for="cliente">Cliente</Label>
      <Select id="cliente" v-model="clienteId" :options="opcoesClientes" placeholder="Selecione o cliente" />
    </div>

    <p v-if="clienteSelecionado" class="rounded-md bg-[hsl(var(--muted))] px-3 py-2 text-sm">
      Saldo atual:
      <span :class="clienteSelecionado.saldoAtual > 0 ? 'font-semibold text-[hsl(var(--destructive))]' : 'font-semibold text-[hsl(var(--success))]'">
        {{ formatCurrency(clienteSelecionado.saldoAtual) }}
      </span>
    </p>

    <div>
      <Label for="valor">Valor pago</Label>
      <Input id="valor" v-model.number="valor" type="number" min="0" step="0.01" />
    </div>

    <div>
      <Label for="metodo">Método de pagamento</Label>
      <Select id="metodo" v-model="metodo" :options="METODOS" />
    </div>

    <div>
      <Label for="referencia">Número/referência (opcional)</Label>
      <Input id="referencia" v-model="referencia" />
    </div>

    <div>
      <Label for="observacoes">Observações</Label>
      <Textarea id="observacoes" v-model="observacoes" />
    </div>

    <p v-if="erro.mensagem" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro.mensagem }}</p>
    <p class="text-xs text-[hsl(var(--muted-foreground))]">
      O valor é aplicado automaticamente às faturas em aberto mais antigas primeiro. Um recibo é emitido automaticamente.
    </p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="submit" :disabled="props.aGuardar">{{ props.aGuardar ? 'A registar…' : 'Registar Pagamento' }}</Button>
    </div>
  </form>
</template>
