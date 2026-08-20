<script setup lang="ts">
import { reactive, watch } from 'vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Button from '@/components/ui/Button.vue'
import type { Customer, CustomerType } from '@/types/models'

const props = defineProps<{ inicial?: Partial<Customer>; aGuardar: boolean }>()
const emit = defineEmits<{ submeter: [dados: Record<string, unknown>]; cancelar: [] }>()

const TIPOS: { value: CustomerType; label: string }[] = [
  { value: 'domestico', label: 'Doméstico' },
  { value: 'comercial', label: 'Comercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'publico', label: 'Público' },
]

const ESTADOS = [
  { value: 'ativo', label: 'Ativo' },
  { value: 'inativo', label: 'Inativo' },
]

const form = reactive({
  nome: props.inicial?.nome ?? '',
  documento: props.inicial?.documento ?? '',
  telefone: props.inicial?.telefone ?? '',
  email: props.inicial?.email ?? '',
  endereco: props.inicial?.endereco ?? '',
  bairro: props.inicial?.bairro ?? '',
  zona: props.inicial?.zona ?? '',
  tipo: props.inicial?.tipo ?? 'domestico',
  estado: props.inicial?.estado ?? 'ativo',
  observacoes: props.inicial?.observacoes ?? '',
})

const erros = reactive<Record<string, string>>({})

watch(
  () => props.inicial,
  (novo) => {
    Object.assign(form, {
      nome: novo?.nome ?? '',
      documento: novo?.documento ?? '',
      telefone: novo?.telefone ?? '',
      email: novo?.email ?? '',
      endereco: novo?.endereco ?? '',
      bairro: novo?.bairro ?? '',
      zona: novo?.zona ?? '',
      tipo: novo?.tipo ?? 'domestico',
      estado: novo?.estado ?? 'ativo',
      observacoes: novo?.observacoes ?? '',
    })
  },
)

function validar(): boolean {
  Object.keys(erros).forEach((k) => delete erros[k])
  if (!form.nome.trim()) erros.nome = 'Nome é obrigatório.'
  if (!form.documento.trim()) erros.documento = 'Documento é obrigatório.'
  if (!form.telefone.trim()) erros.telefone = 'Telefone é obrigatório.'
  if (!form.endereco.trim()) erros.endereco = 'Endereço é obrigatório.'
  if (!form.bairro.trim()) erros.bairro = 'Bairro é obrigatório.'
  if (!form.zona.trim()) erros.zona = 'Zona é obrigatória.'
  return Object.keys(erros).length === 0
}

function submeter() {
  if (!validar()) return
  emit('submeter', { ...form })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submeter">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label for="nome">Nome completo</Label>
        <Input id="nome" v-model="form.nome" placeholder="Nome do cliente" />
        <p v-if="erros.nome" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.nome }}</p>
      </div>
      <div>
        <Label for="documento">Número de documento</Label>
        <Input id="documento" v-model="form.documento" placeholder="BI / NUIT" />
        <p v-if="erros.documento" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.documento }}</p>
      </div>
      <div>
        <Label for="telefone">Telefone</Label>
        <Input id="telefone" v-model="form.telefone" placeholder="84xxxxxxx" />
        <p v-if="erros.telefone" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.telefone }}</p>
      </div>
      <div>
        <Label for="email">Email</Label>
        <Input id="email" v-model="form.email" type="email" placeholder="opcional" />
      </div>
      <div class="sm:col-span-2">
        <Label for="endereco">Endereço</Label>
        <Input id="endereco" v-model="form.endereco" placeholder="Rua, número" />
        <p v-if="erros.endereco" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.endereco }}</p>
      </div>
      <div>
        <Label for="bairro">Bairro</Label>
        <Input id="bairro" v-model="form.bairro" />
        <p v-if="erros.bairro" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.bairro }}</p>
      </div>
      <div>
        <Label for="zona">Zona</Label>
        <Input id="zona" v-model="form.zona" />
        <p v-if="erros.zona" class="mt-1 text-xs text-[hsl(var(--destructive))]">{{ erros.zona }}</p>
      </div>
      <div>
        <Label for="tipo">Tipo de cliente</Label>
        <Select id="tipo" v-model="form.tipo" :options="TIPOS" />
      </div>
      <div>
        <Label for="estado">Estado</Label>
        <Select id="estado" v-model="form.estado" :options="ESTADOS" />
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
