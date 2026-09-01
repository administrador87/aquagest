<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { Camera, X } from 'lucide-vue-next'
import { useCustomersStore } from '@/stores/customers'
import { useMetersStore } from '@/stores/meters'
import { useReadingsStore } from '@/stores/readings'
import { useAuthStore } from '@/stores/auth'
import { usePermissions } from '@/composables/usePermissions'
import { comprimirImagem } from '@/utils/image'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Button from '@/components/ui/Button.vue'
import type { RegistarLeituraParams } from '@/services/meterReadings'

const props = defineProps<{ clienteIdFixo?: string; apenasFonte?: boolean; aGuardar: boolean }>()
const emit = defineEmits<{ submeter: [dados: RegistarLeituraParams]; cancelar: [] }>()

const customersStore = useCustomersStore()
const metersStore = useMetersStore()
const readingsStore = useReadingsStore()
const auth = useAuthStore()
const { pode } = usePermissions()

const clienteId = ref(props.clienteIdFixo ?? '')
const contadorId = ref('')
const dataLeitura = ref(new Date().toISOString().slice(0, 10))
const leituraAtual = ref<number>(0)
const observacoes = ref('')
const fotoUrl = ref<string | undefined>(undefined)
const aProcessarFoto = ref(false)
const corrigir = ref(false)
const motivoCorrecao = ref('')
const erro = ref('')

const opcoesClientes = computed(() =>
  customersStore.itens.map((c) => ({ value: c.id, label: `${c.codigo} — ${c.nome}` })),
)

const contadoresDoCliente = computed(() =>
  props.apenasFonte
    ? metersStore.contadoresDaFonte.filter((m) => m.estado === 'ativo')
    : metersStore.itens.filter((m) => m.clienteId === clienteId.value && m.estado === 'ativo'),
)
const opcoesContadores = computed(() =>
  contadoresDoCliente.value.map((m) => ({ value: m.id, label: `${m.numero} (${m.numeroSerie})` })),
)

watch(
  clienteId,
  () => {
    contadorId.value = contadoresDoCliente.value[0]?.id ?? ''
  },
  { immediate: true },
)

if (props.apenasFonte) {
  // Só há um contador da fonte (normalmente), pré-seleciona-o assim que a lista carregar.
  watch(contadoresDoCliente, () => {
    if (!contadorId.value) contadorId.value = contadoresDoCliente.value[0]?.id ?? ''
  }, { immediate: true })
}

const contadorSelecionado = computed(() => metersStore.itens.find((m) => m.id === contadorId.value))
const ultimaLeitura = computed(() => (contadorId.value ? readingsStore.ultimaPorContador(contadorId.value) : undefined))
const leituraAnterior = computed(() => ultimaLeitura.value?.leituraAtual ?? contadorSelecionado.value?.leituraInicial ?? 0)

const consumoPrevisto = computed(() => leituraAtual.value - leituraAnterior.value)
const leituraInvalida = computed(() => consumoPrevisto.value < 0)

async function onFoto(evento: Event) {
  const ficheiro = (evento.target as HTMLInputElement).files?.[0]
  if (!ficheiro) return
  aProcessarFoto.value = true
  try {
    fotoUrl.value = await comprimirImagem(ficheiro)
  } catch {
    erro.value = 'Não foi possível processar a fotografia.'
  } finally {
    aProcessarFoto.value = false
  }
}

function submeter() {
  erro.value = ''
  if (!props.apenasFonte && !clienteId.value) {
    erro.value = 'Selecione o cliente.'
    return
  }
  if (!contadorId.value) {
    erro.value = props.apenasFonte
      ? 'Não existe nenhum contador da fonte ativo. Registe um em Contadores primeiro.'
      : 'Este cliente não tem contador ativo. Registe um contador primeiro.'
    return
  }
  if (leituraInvalida.value && !corrigir.value) {
    erro.value = 'A leitura atual é menor que a anterior. Marque "corrigir leitura" se isto está correto.'
    return
  }
  if (leituraInvalida.value && corrigir.value && !motivoCorrecao.value.trim()) {
    erro.value = 'Indique o motivo da correção.'
    return
  }

  emit('submeter', {
    clienteId: props.apenasFonte ? undefined : clienteId.value,
    contadorId: contadorId.value,
    data: new Date(dataLeitura.value).getTime(),
    leituraAnterior: leituraAnterior.value,
    leituraAtual: Number(leituraAtual.value),
    leitorNome: auth.perfil?.nome ?? 'Desconhecido',
    fotoUrl: fotoUrl.value,
    observacoes: observacoes.value,
    forcarCorrecao: leituraInvalida.value && corrigir.value,
    motivoCorrecao: motivoCorrecao.value,
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submeter">
    <div v-if="!clienteIdFixo && !apenasFonte">
      <Label for="cliente">Cliente</Label>
      <Select id="cliente" v-model="clienteId" :options="opcoesClientes" placeholder="Selecione o cliente" />
    </div>

    <div>
      <Label for="contador">Contador{{ apenasFonte ? ' da Fonte' : '' }}</Label>
      <Select
        id="contador"
        v-model="contadorId"
        :options="opcoesContadores"
        placeholder="Selecione o contador"
        :disabled="!apenasFonte && !clienteId"
      />
      <p v-if="!apenasFonte && clienteId && opcoesContadores.length === 0" class="mt-1 text-xs text-[hsl(var(--warning))]">
        Este cliente não tem contador ativo registado.
      </p>
      <p v-if="apenasFonte && opcoesContadores.length === 0" class="mt-1 text-xs text-[hsl(var(--warning))]">
        Não existe nenhum contador da fonte ativo. Crie um em Contadores → "Novo Contador da Fonte".
      </p>
    </div>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="data">Data da leitura</Label>
        <Input id="data" v-model="dataLeitura" type="date" />
      </div>
      <div>
        <Label>Leitura anterior</Label>
        <Input :model-value="leituraAnterior" type="number" disabled />
      </div>
    </div>

    <div>
      <Label for="leituraAtual">Leitura atual (m³)</Label>
      <Input id="leituraAtual" v-model.number="leituraAtual" type="number" step="0.01" />
      <p class="mt-1 text-xs" :class="leituraInvalida ? 'text-[hsl(var(--destructive))]' : 'text-[hsl(var(--muted-foreground))]'">
        Consumo calculado: {{ leituraInvalida ? '—' : `${consumoPrevisto.toFixed(2)} m³` }}
      </p>
    </div>

    <div v-if="leituraInvalida && pode('readings', 'correct')" class="rounded-md border border-[hsl(var(--warning))]/30 bg-[hsl(var(--warning))]/5 p-3">
      <label class="flex items-center gap-2 text-sm font-medium">
        <input v-model="corrigir" type="checkbox" />
        Confirmo e autorizo a correção desta leitura
      </label>
      <Textarea v-if="corrigir" v-model="motivoCorrecao" placeholder="Motivo da correção (ex: troca de contador)" class="mt-2" />
    </div>

    <div>
      <Label>Fotografia do contador (opcional)</Label>
      <div class="flex items-center gap-3">
        <label class="flex h-10 cursor-pointer items-center gap-2 rounded-md border border-[hsl(var(--border))] px-3 text-sm hover:bg-[hsl(var(--accent))]">
          <Camera :size="16" />
          {{ aProcessarFoto ? 'A processar…' : 'Escolher foto' }}
          <input type="file" accept="image/*" capture="environment" class="hidden" @change="onFoto" />
        </label>
        <div v-if="fotoUrl" class="relative">
          <img :src="fotoUrl" class="h-10 w-10 rounded-md object-cover" />
          <button type="button" class="absolute -right-1 -top-1 rounded-full bg-[hsl(var(--destructive))] p-0.5 text-white" @click="fotoUrl = undefined">
            <X :size="10" />
          </button>
        </div>
      </div>
    </div>

    <div>
      <Label for="observacoes">Observações</Label>
      <Textarea id="observacoes" v-model="observacoes" />
    </div>

    <p v-if="erro" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro }}</p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="submit" :disabled="aGuardar">{{ aGuardar ? 'A guardar…' : 'Registar Leitura' }}</Button>
    </div>
  </form>
</template>
