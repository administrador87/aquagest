<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useConnectionsStore } from '@/stores/connections'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import type { Connection } from '@/types/models'

const props = defineProps<{ pedido: Connection }>()
const emit = defineEmits<{ concluida: []; cancelar: [] }>()

const store = useConnectionsStore()

const form = reactive({
  numero: '',
  numeroSerie: '',
  marca: '',
  modelo: '',
  leituraInicial: 0,
})

const aGuardar = ref(false)
const erro = ref('')

async function submeter() {
  erro.value = ''
  if (!form.numero.trim() || !form.numeroSerie.trim()) {
    erro.value = 'Indique o número e a série do contador instalado.'
    return
  }
  aGuardar.value = true
  try {
    await store.concluirInstalacao(props.pedido.id, {
      numero: form.numero,
      numeroSerie: form.numeroSerie,
      marca: form.marca,
      modelo: form.modelo,
      leituraInicial: Number(form.leituraInicial),
    })
    emit('concluida')
  } catch (e) {
    erro.value = e instanceof Error ? e.message : 'Não foi possível concluir a instalação.'
  } finally {
    aGuardar.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <p class="text-sm text-[hsl(var(--muted-foreground))]">
      Ao concluir, será criado automaticamente um cliente ativo para <strong>{{ pedido.nomeSolicitante }}</strong> com o contador abaixo.
    </p>

    <div class="grid grid-cols-2 gap-4">
      <div>
        <Label for="numero">Número do contador</Label>
        <Input id="numero" v-model="form.numero" />
      </div>
      <div>
        <Label for="numeroSerie">Número de série</Label>
        <Input id="numeroSerie" v-model="form.numeroSerie" />
      </div>
      <div>
        <Label for="marca">Marca</Label>
        <Input id="marca" v-model="form.marca" />
      </div>
      <div>
        <Label for="modelo">Modelo</Label>
        <Input id="modelo" v-model="form.modelo" />
      </div>
      <div class="col-span-2">
        <Label for="leituraInicial">Leitura inicial (m³)</Label>
        <Input id="leituraInicial" v-model.number="form.leituraInicial" type="number" min="0" step="0.01" />
      </div>
    </div>

    <p v-if="erro" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro }}</p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="button" :disabled="aGuardar" @click="submeter">{{ aGuardar ? 'A concluir…' : 'Concluir Instalação' }}</Button>
    </div>
  </div>
</template>
