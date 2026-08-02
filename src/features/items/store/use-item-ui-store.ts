import { create } from 'zustand'

import type { ItemId } from '@/domain/value-objects/item-id'

/**
 * Ephemeral UI state only — never the source of truth for persisted data,
 * which always flows through repositories/use-cases.
 */
interface ItemUiState {
  isQuickCaptureOpen: boolean
  openQuickCapture: () => void
  closeQuickCapture: () => void
  selectedItemId: ItemId | null
  selectItem: (id: ItemId | null) => void
}

export const useItemUiStore = create<ItemUiState>((set) => ({
  isQuickCaptureOpen: false,
  openQuickCapture: () => {
    set({ isQuickCaptureOpen: true })
  },
  closeQuickCapture: () => {
    set({ isQuickCaptureOpen: false })
  },
  selectedItemId: null,
  selectItem: (id) => {
    set({ selectedItemId: id })
  },
}))
