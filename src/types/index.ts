export type Unit = 'g' | 'ml' | 'kg' | 'l' | 'pcs' | 'shots'

export type UserRole = 'barista' | 'manager' | 'owner'

export type TransactionType = 'sale' | 'adjustment' | 'return' | 'waste'

export type SyncStatus = 'pending' | 'synced' | 'failed'

export interface User {
  id: string
  name: string
  role: UserRole
  pin: string
  syncStatus: SyncStatus
  createdAt: string
}

export interface Product {
  id: string
  name: string
  unit: Unit
  costPrice: number
  sellPrice: number | null
  stockLevel: number
  minStockLevel: number
  bulkQuantity: number | null
  bulkPrice: number | null
  batchId: string | null
  syncStatus: SyncStatus
  createdAt: string
  updatedAt: string
}

export interface MenuItem {
  id: string
  name: string
  category: string
  sellPrice: number
  active: number
  syncStatus: SyncStatus
  createdAt: string
}

export interface Recipe {
  id: string
  menuItemId: string
  productId: string
  quantityUsed: number
  unit: Unit
  wastePercent: number
}

export interface Transaction {
  id: string
  type: TransactionType
  userId: string
  totalAmount: number
  subtotal: number
  taxAmount: number
  discount: number
  paymentMethod: 'cash' | 'card' | 'mobile'
  syncStatus: SyncStatus
  createdAt: string
}

export interface TransactionItem {
  id: string
  transactionId: string
  menuItemId: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface InventoryLog {
  id: string
  productId: string
  type: TransactionType
  quantityChange: number
  stockBefore: number
  stockAfter: number
  referenceType: string
  referenceId: string
  userId: string
  createdAt: string
}

export interface SyncQueueItem {
  id: string
  table: string
  recordId: string
  operation: 'insert' | 'update' | 'delete'
  payload: string
  status: SyncStatus
  retryCount: number
  createdAt: string
}

export interface Expense {
  id: string
  description: string
  amount: number
  category: string
  date: string
  userId: string
  createdAt: string
}

export interface Supplier {
  id: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  active: number
  createdAt: string
}

export interface SupplierProduct {
  id: string
  supplierId: string
  productId: string
  supplierSku: string | null
  unitCost: number | null
  leadTimeDays: number | null
  lastOrderDate: string | null
}

export interface WasteLog {
  id: string
  productId: string
  quantity: number
  reason: string
  userId: string
  createdAt: string
}

export interface Discount {
  id: string
  code: string
  type: 'percent' | 'fixed'
  value: number
  minOrder: number
  maxUses: number | null
  uses: number
  active: number
  expiresAt: string | null
  createdAt: string
}
