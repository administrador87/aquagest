import { storeToRefs } from 'pinia'
import { useSyncStore } from '@/stores/sync'

export function useOnlineStatus() {
  const sync = useSyncStore()
  const { online, totalPendentes, ultimaSincronizacao } = storeToRefs(sync)
  return { online, totalPendentes, ultimaSincronizacao }
}
