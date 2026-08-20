<script setup lang="ts">
import { reactive } from 'vue'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import type { UserRole } from '@/types/models'

const props = defineProps<{ aGuardar: boolean }>()
const emit = defineEmits<{
  submeter: [dados: { nome: string; email: string; password: string; papel: UserRole }]
  cancelar: []
}>()

const PAPEIS: { value: UserRole; label: string }[] = [
  { value: 'admin', label: 'Administrador' },
  { value: 'gestor', label: 'Gestor' },
  { value: 'tecnico', label: 'Técnico/Leiturista' },
  { value: 'operador', label: 'Operador de Faturação' },
]

const form = reactive({ nome: '', email: '', password: '', papel: 'operador' as UserRole })
const erro = reactive({ mensagem: '' })

function submeter() {
  erro.mensagem = ''
  if (!form.nome.trim() || !form.email.trim()) {
    erro.mensagem = 'Preencha o nome e o email.'
    return
  }
  if (form.password.length < 6) {
    erro.mensagem = 'A palavra-passe deve ter pelo menos 6 caracteres.'
    return
  }
  emit('submeter', { ...form })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submeter">
    <div>
      <Label for="nome">Nome completo</Label>
      <Input id="nome" v-model="form.nome" />
    </div>
    <div>
      <Label for="email">Email</Label>
      <Input id="email" v-model="form.email" type="email" />
    </div>
    <div>
      <Label for="password">Palavra-passe inicial</Label>
      <Input id="password" v-model="form.password" type="password" />
    </div>
    <div>
      <Label for="papel">Papel</Label>
      <Select id="papel" v-model="form.papel" :options="PAPEIS" />
    </div>

    <p v-if="erro.mensagem" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro.mensagem }}</p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="submit" :disabled="props.aGuardar">{{ props.aGuardar ? 'A criar…' : 'Criar Utilizador' }}</Button>
    </div>
  </form>
</template>
