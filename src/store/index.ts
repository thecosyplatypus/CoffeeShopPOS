import { create } from 'zustand'
import type { User, Product, MenuItem } from '@/types'

interface CartItem {
  menuItem: MenuItem
  quantity: number
}

interface AppState {
  user: User | null
  needsSetup: boolean
  cart: CartItem[]
  menuItems: MenuItem[]
  products: Product[]
  sidebarOpen: boolean
  isOnline: boolean

  setUser: (user: User | null) => void
  setNeedsSetup: (needs: boolean) => void
  addToCart: (item: MenuItem) => void
  removeFromCart: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  clearCart: () => void
  setMenuItems: (items: MenuItem[]) => void
  setProducts: (products: Product[]) => void
  toggleSidebar: () => void
  setOnline: (online: boolean) => void
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  needsSetup: false,
  cart: [],
  menuItems: [],
  products: [],
  sidebarOpen: true,
  isOnline: navigator.onLine,

  setUser: (user) => set({ user }),
  setNeedsSetup: (needsSetup) => set({ needsSetup }),

  addToCart: (item) =>
    set((state) => {
      const existing = state.cart.find((ci) => ci.menuItem.id === item.id)
      if (existing) {
        return {
          cart: state.cart.map((ci) =>
            ci.menuItem.id === item.id
              ? { ...ci, quantity: ci.quantity + 1 }
              : ci
          ),
        }
      }
      return { cart: [...state.cart, { menuItem: item, quantity: 1 }] }
    }),

  removeFromCart: (menuItemId) =>
    set((state) => ({
      cart: state.cart.filter((ci) => ci.menuItem.id !== menuItemId),
    })),

  updateQuantity: (menuItemId, quantity) =>
    set((state) => {
      if (quantity <= 0) {
        return { cart: state.cart.filter((ci) => ci.menuItem.id !== menuItemId) }
      }
      return {
        cart: state.cart.map((ci) =>
          ci.menuItem.id === menuItemId ? { ...ci, quantity } : ci
        ),
      }
    }),

  clearCart: () => set({ cart: [] }),

  setMenuItems: (items) => set({ menuItems: items }),

  setProducts: (products) => set({ products }),

  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

  setOnline: (online) => set({ isOnline: online }),
}))
