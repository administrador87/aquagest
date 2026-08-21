<script setup lang="ts">
import { reactive } from 'vue'
import { Plus, Trash2 } from 'lucide-vue-next'
import Input from '@/components/ui/Input.vue'
import Label from '@/components/ui/Label.vue'
import Button from '@/components/ui/Button.vue'
import type { Tariff } from '@/types/models'

const props = defineProps<{ aGuardar: boolean }>()
const emit = defineEmits<{
  submeter: [dados: Omit<Tariff, 'id' | 'criadoEm' | 'ativa' | 'validoAte'>]
  cancelar: []
}>()

const form = reactive({
  nome: '',
  validoDesde: new Date().toISOString().slice(0, 10),
  taxaFixa: 0,
  taxaManutencao: 0,
  impostoPercentagem: 0,
})

const escaloes = reactive<{ deM3: number; ateM3: number | null; precoM3: number }[]>([
  { deM3: 0, ateM3: 5, precoM3: 0 },
])

const outrasTaxas = reactive<{ nome: string; valor: number }[]>([])

const erro = reactive({ mensagem: '' })

function adicionarEscalao() {
  const ultimo = escaloes[escaloes.length - 1]
  escaloes.push({ deM3: (ultimo?.ateM3 ?? 0) + 1, ateM3: null, precoM3: 0 })
}
function removerEscalao(index: number) {
  escaloes.splice(index, 1)
}

function adicionarTaxa() {
  outrasTaxas.push({ nome: '', valor: 0 })
}
function removerTaxa(index: number) {
  outrasTaxas.splice(index, 1)
}

function submeter() {
  erro.mensagem = ''
  if (!form.nome.trim()) {
    erro.mensagem = 'Indique um nome para esta tarifa (ex: Tarifa 2026).'
    return
  }
  if (escaloes.length === 0) {
    erro.mensagem = 'Adicione pelo menos um escalão de consumo.'
    return
  }

  emit('submeter', {
    nome: form.nome,
    validoDesde: new Date(form.validoDesde).getTime(),
    escaloes: escaloes.map((e) => ({
      ...e,
      // O campo "Até" fica vazio (string '') quando o utilizador o limpa para indicar "sem
      // limite superior" — sem este tratamento, v-model.number guardaria isso como 0 em vez de
      // "sem limite", cortando silenciosamente a tarifa e sub-cobrando o consumo acima disso.
      ateM3: e.ateM3 === null || e.ateM3 === ('' as unknown as number) ? null : Number(e.ateM3),
    })),
    taxaFixa: Number(form.taxaFixa),
    taxaManutencao: Number(form.taxaManutencao),
    outrasTaxas: outrasTaxas.filter((t) => t.nome.trim()),
    impostoPercentagem: Number(form.impostoPercentagem),
  })
}
</script>

<template>
  <form class="flex flex-col gap-4" @submit.prevent="submeter">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <Label for="nome">Nome da tarifa</Label>
        <Input id="nome" v-model="form.nome" placeholder="ex: Tarifa 2026" />
      </div>
      <div>
        <Label for="validoDesde">Válida a partir de</Label>
        <Input id="validoDesde" v-model="form.validoDesde" type="date" />
      </div>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <Label class="mb-0">Escalões de consumo (m³)</Label>
        <Button type="button" variant="outline" size="sm" @click="adicionarEscalao">
          <Plus :size="14" /> Adicionar escalão
        </Button>
      </div>
      <div class="flex flex-col gap-2">
        <div v-for="(escalao, i) in escaloes" :key="i" class="grid grid-cols-[1fr_1fr_1fr_auto] items-end gap-2">
          <div>
            <Label class="text-xs">De (m³)</Label>
            <Input v-model.number="escalao.deM3" type="number" min="0" />
          </div>
          <div>
            <Label class="text-xs">Até (m³, vazio = sem limite)</Label>
            <Input v-model.number="escalao.ateM3" type="number" min="0" />
          </div>
          <div>
            <Label class="text-xs">Preço/m³</Label>
            <Input v-model.number="escalao.precoM3" type="number" min="0" step="0.01" />
          </div>
          <button type="button" class="mb-2 rounded-md p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10" @click="removerEscalao(i)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div>
        <Label for="taxaFixa">Taxa fixa</Label>
        <Input id="taxaFixa" v-model.number="form.taxaFixa" type="number" min="0" step="0.01" />
      </div>
      <div>
        <Label for="taxaManutencao">Taxa de manutenção</Label>
        <Input id="taxaManutencao" v-model.number="form.taxaManutencao" type="number" min="0" step="0.01" />
      </div>
      <div>
        <Label for="imposto">Imposto (%)</Label>
        <Input id="imposto" v-model.number="form.impostoPercentagem" type="number" min="0" step="0.01" />
      </div>
    </div>

    <div>
      <div class="mb-2 flex items-center justify-between">
        <Label class="mb-0">Outras taxas</Label>
        <Button type="button" variant="outline" size="sm" @click="adicionarTaxa">
          <Plus :size="14" /> Adicionar taxa
        </Button>
      </div>
      <div class="flex flex-col gap-2">
        <div v-for="(taxa, i) in outrasTaxas" :key="i" class="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
          <div>
            <Label class="text-xs">Nome</Label>
            <Input v-model="taxa.nome" placeholder="ex: Taxa de saneamento" />
          </div>
          <div>
            <Label class="text-xs">Valor</Label>
            <Input v-model.number="taxa.valor" type="number" min="0" step="0.01" />
          </div>
          <button type="button" class="mb-2 rounded-md p-2 text-[hsl(var(--destructive))] hover:bg-[hsl(var(--destructive))]/10" @click="removerTaxa(i)">
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <p v-if="erro.mensagem" class="rounded-md bg-[hsl(var(--destructive))]/10 px-3 py-2 text-sm text-[hsl(var(--destructive))]">{{ erro.mensagem }}</p>
    <p class="text-xs text-[hsl(var(--muted-foreground))]">
      Ao guardar, esta passa a ser a tarifa ativa. A tarifa anterior é preservada para que faturas já emitidas não sejam recalculadas.
    </p>

    <div class="flex justify-end gap-2 pt-2">
      <Button type="button" variant="outline" @click="emit('cancelar')">Cancelar</Button>
      <Button type="submit" :disabled="props.aGuardar">{{ props.aGuardar ? 'A guardar…' : 'Guardar Tarifa' }}</Button>
    </div>
  </form>
</template>
