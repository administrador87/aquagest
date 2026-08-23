<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '@/firebase/config'
import { Smartphone, Landmark, MoreHorizontal, Droplets } from 'lucide-vue-next'
import type { AppSettings, MetodoPagamentoInfo } from '@/types/models'

type InfoPublica = Pick<
  AppSettings,
  'nomeEmpresa' | 'banco' | 'numeroConta' | 'nib' | 'metodoMpesa' | 'metodoEmola' | 'metodoTransferencia' | 'metodoOutro'
>

const route = useRoute()
const referencia = computed(() => (route.query.ref as string) || '')

const info = ref<InfoPublica | null>(null)
const aCarregar = ref(true)
const erro = ref('')

onMounted(async () => {
  try {
    const snap = await getDoc(doc(db, 'publicPaymentInfo', 'geral'))
    if (snap.exists()) {
      info.value = snap.data() as InfoPublica
    } else {
      erro.value = 'A informação de pagamento ainda não foi configurada.'
    }
  } catch {
    erro.value = 'Não foi possível carregar a informação de pagamento. Tente novamente mais tarde.'
  } finally {
    aCarregar.value = false
  }
})

type ChaveMetodo = 'metodoMpesa' | 'metodoEmola' | 'metodoTransferencia' | 'metodoOutro'

const METODOS: { chave: ChaveMetodo; label: string; icon: typeof Smartphone; cor: string }[] = [
  { chave: 'metodoMpesa', label: 'M-Pesa', icon: Smartphone, cor: '#dc2626' },
  { chave: 'metodoEmola', label: 'E-Mola', icon: Smartphone, cor: '#f59e0b' },
  { chave: 'metodoTransferencia', label: 'Transferência Bancária', icon: Landmark, cor: '#0b3d6b' },
  { chave: 'metodoOutro', label: 'Outro', icon: MoreHorizontal, cor: '#64748b' },
]

function metodoInfo(chave: ChaveMetodo): MetodoPagamentoInfo | undefined {
  return info.value?.[chave]
}

const metodosVisiveis = computed(() => METODOS.filter((m) => metodoInfo(m.chave)?.ativo !== false))
</script>

<template>
  <div class="min-h-screen bg-slate-100 flex items-center justify-center p-4">
    <div class="w-full max-w-md rounded-xl bg-white p-6 shadow-sm">
      <div v-if="aCarregar" class="py-10 text-center text-sm text-slate-500">A carregar…</div>
      <div v-else-if="erro" class="py-10 text-center text-sm text-red-600">{{ erro }}</div>
      <template v-else>
        <div class="mb-4 flex flex-col items-center text-center">
          <Droplets :size="32" class="mb-2 text-sky-500" />
          <h1 class="text-lg font-bold text-[#0b3d6b]">{{ info?.nomeEmpresa || 'Empresa de Águas' }}</h1>
          <p class="mt-1 text-sm text-slate-500">Escolha uma via de pagamento</p>
          <p v-if="referencia" class="mt-1 text-xs text-slate-400">Referente a: {{ referencia }}</p>
        </div>

        <div v-if="metodosVisiveis.length === 0" class="py-6 text-center text-sm text-slate-500">
          Nenhuma via de pagamento configurada. Contacte-nos diretamente.
        </div>

        <div class="space-y-3">
          <div v-for="m in metodosVisiveis" :key="m.chave" class="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
            <img
              v-if="metodoInfo(m.chave)?.icone"
              :src="metodoInfo(m.chave)!.icone"
              class="h-11 w-11 flex-shrink-0 rounded-full object-cover"
            />
            <div
              v-else
              class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-white"
              :style="{ background: m.cor }"
            >
              <component :is="m.icon" :size="20" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-slate-800">{{ m.label }}</div>
              <div v-if="metodoInfo(m.chave)?.numero" class="text-sm text-slate-600">{{ metodoInfo(m.chave)?.numero }}</div>
              <template v-if="m.chave === 'metodoTransferencia'">
                <div v-if="info?.banco" class="text-xs text-slate-500">Banco: {{ info.banco }}</div>
                <div v-if="info?.numeroConta" class="text-xs text-slate-500">Conta: {{ info.numeroConta }}</div>
                <div v-if="info?.nib" class="text-xs text-slate-500">NIB: {{ info.nib }}</div>
              </template>
            </div>
          </div>
        </div>

        <p class="mt-5 text-center text-[10px] text-slate-400">Após o pagamento, envie o comprovativo à empresa.</p>
      </template>
    </div>
  </div>
</template>
