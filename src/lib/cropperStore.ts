import { writable } from 'svelte/store'

export interface CropperState {
  imageUrl: string | null
  categoryId: number | null
  onApply: ((url: string, assetId: number) => void) | null
  onClose: (() => void) | null
}

function createCropperStore() {
  const { subscribe, set, update } = writable<CropperState>({
    imageUrl: null,
    categoryId: null,
    onApply: null,
    onClose: null
  })

  return {
    subscribe,
    open: (imageUrl: string, categoryId: number, onApply: (url: string, assetId: number) => void, onClose: () => void) => {
      console.log('cropperStore.open() called with:', { imageUrl, categoryId })
      set({ imageUrl, categoryId, onApply, onClose })
    },
    close: () => {
      console.log('cropperStore.close() called')
      set({ imageUrl: null, categoryId: null, onApply: null, onClose: null })
    }
  }
}

export const cropperStore = createCropperStore()
