import { create } from 'zustand'

interface OfflineState {
  downloadedIds: string[]
  isOnline: boolean
  downloading: Record<string, boolean>
  downloadProgress: Record<string, number>
  setDownloadedIds: (ids: string[]) => void
  addDownloadedId: (id: string) => void
  removeDownloadedId: (id: string) => void
  setOnline: (online: boolean) => void
  setDownloading: (id: string, v: boolean) => void
  setProgress: (id: string, p: number) => void
}

export const useOfflineStore = create<OfflineState>((set) => ({
  downloadedIds: [],
  isOnline: true,
  downloading: {},
  downloadProgress: {},
  setDownloadedIds: (ids) => set({ downloadedIds: ids }),
  addDownloadedId: (id) => set((s) => ({ downloadedIds: s.downloadedIds.includes(id) ? s.downloadedIds : [...s.downloadedIds, id] })),
  removeDownloadedId: (id) => set((s) => ({ downloadedIds: s.downloadedIds.filter((i) => i !== id) })),
  setOnline: (online) => set({ isOnline: online }),
  setDownloading: (id, v) => set((s) => ({ downloading: { ...s.downloading, [id]: v } })),
  setProgress: (id, p) => set((s) => ({ downloadProgress: { ...s.downloadProgress, [id]: p } })),
}))
