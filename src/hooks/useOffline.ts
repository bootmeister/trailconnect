import { useEffect } from 'react'
import NetInfo from '@react-native-community/netinfo'
import { useOfflineStore } from '@/store/offlineStore'
import { getAllDownloadedIds } from '@/services/offlineService'

export function useNetwork() {
  useEffect(() => {
    const unsub = NetInfo.addEventListener((state) => {
      useOfflineStore.getState().setOnline(state.isConnected ?? true)
    })
    return () => unsub()
  }, [])
}

export function useInitOffline() {
  useEffect(() => {
    getAllDownloadedIds().then((ids) => {
      useOfflineStore.getState().setDownloadedIds(ids)
    })
  }, [])
}
