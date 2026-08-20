<script setup lang="ts">
import { reactive } from 'vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Button from '@/components/ui/Button.vue'
import type { Meter } from '@/types/models'

const props = defineProps<{ inicial?: Partial<Meter>; aGuardar: boolean; ocultarCliente?: boolean }>()
const emit = defineEmits<{ submeter: [dados: Record<string, unknown>]; cancelar: [] }>()

const ESTADOS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'avariado', label: 'Avariado' },
  { value: 'removido', label: 'Removido' },
]

const form = reactive({
  numero: props.inicial?.numero ?? '',
  numeroSerie: props.inicial?.numeroSerie ?? '',
  marca: props.inicial?.marca ?? '',
  modelo: props.inicial?.modelo ?? '',
  dataInstalacao: props.inicial?.dataInstalacao
    ? new Date(props.inicial.dataInstalacao).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10),
  leituraInicial: props.inicial?.leituraInicial ?? 0,
  estado: props.inicial?.estado ?? 'ativo',
  localizacao: props.inicial?.localizacao ?? '',
  observacoes: props.inicial?.observacoes ?? '',
})

const erros = reactive<Record<string, string>>({})

function validar(): boolean {
  Object.keys(erros).forEach((k) => delete erros[k])
  if (!form.numero.trim()) erros.numero = 'Número do contador é obrigatório.'
  if (!form.numeroSerie.trim()) erros.numeroSerie = 'Número de série é obrigatório.'
  if (form.leituraInicial < 0) erros.leituraInicial = 'Deve ser um número positivo.'
  return Object.keys(erros).length === 0
}

function submeter() {
  if (!validar()) return
  emit('submeter', {
    ...form,
    dataInstalacao: new Date(form.dataInstalacao).getTime(),
    leituraInicial: Number(form.leituraInicial),
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submeter">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label for="numero">Número do contador</Label>
        <Input id="numero" v-model="form.numero" />
        <p v-if="erros.numero" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.numero }}</p>
      </div>
      <div>
        <Label for="numeroSerie">Número de série</Label>
        <Input id="numeroSerie" v-model="form.numeroSerie" />
        <p v-if="erros.numeroSerie" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.numeroSerie }}</p>
      </div>
      <div>
        <Label for="marca">Marca</Label>
        <Input id="marca" v-model="form.marca" />
      </div>
      <div>
        <Label for="modelo">Modelo</Label>
        <Input id="modelo" v-model="form.modelo" />
      </div>
      <div>
        <Label for="dataInstalacao">Data de instalação</Label>
        <Input id="dataInstalacao" v-model="form.dataInstalacao" type="date" />
      </div>
      <div>
        <Label for="leituraInicial">Leitura inicial (m³)</Label>
        <Input id="leituraInicial" v-model.number="form.leituraInicial" type="number" step="0.01" />
        <p v-if="erros.leituraInicial" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.leituraInicial }}</p>
      </div>
      <div>
        <Label for="estado">Estado</Label>
        <Select id="estado" v-model="form.estado" :options="ESTADOS" />
      </div>
      <div>
        <Label for="localizacao">Localização</Label>
        <Input id="localizacao" v-model="form.localizacao" placeholder="ex: junto ao portão" />
      </div>
      <div class="sm:col-span-2">
        <Label for="observacoes">Observações</Label>
        <Textarea id="observacoes" v-model="form.observacoes" />
      </div>
    </div>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="submit" :disabled="aGuardar">{{ aGuardar ? 'A guardar…' : 'Guardar' }}</Button>
    </div>
  </form>
</template>
