import { create } from 'zustand'

export interface SettingsState {
  currency: string
  currencyPosition: 'before' | 'after'
  decimalPlaces: number
  storeName: string
  taxRate: number
  receiptAutoHideMs: number

  setCurrency: (currency: string) => void
  setCurrencyPosition: (pos: 'before' | 'after') => void
  setDecimalPlaces: (n: number) => void
  setStoreName: (name: string) => void
  setTaxRate: (rate: number) => void
  setReceiptAutoHideMs: (ms: number) => void
  load: () => void
}

const STORAGE_KEY = 'coffeeshop-settings'

function loadFromStorage(): Partial<SettingsState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveToStorage(state: Partial<SettingsState>) {
  const { currency, currencyPosition, decimalPlaces, storeName, taxRate, receiptAutoHideMs } = state as SettingsState
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ currency, currencyPosition, decimalPlaces, storeName, taxRate, receiptAutoHideMs }))
}

const defaults = {
  currency: '$',
  currencyPosition: 'before' as const,
  decimalPlaces: 2,
  storeName: 'CoffeeShop',
  taxRate: 0,
  receiptAutoHideMs: 5000,
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  ...defaults,

  setCurrency: (currency) => { set({ currency }); saveToStorage({ ...get(), currency }) },
  setCurrencyPosition: (currencyPosition) => { set({ currencyPosition }); saveToStorage({ ...get(), currencyPosition }) },
  setDecimalPlaces: (decimalPlaces) => { set({ decimalPlaces }); saveToStorage({ ...get(), decimalPlaces }) },
  setStoreName: (storeName) => { set({ storeName }); saveToStorage({ ...get(), storeName }) },
  setTaxRate: (taxRate) => { set({ taxRate }); saveToStorage({ ...get(), taxRate }) },
  setReceiptAutoHideMs: (receiptAutoHideMs) => { set({ receiptAutoHideMs }); saveToStorage({ ...get(), receiptAutoHideMs }) },

  load: () => {
    const saved = loadFromStorage()
    set({ ...defaults, ...saved })
  },
}))
