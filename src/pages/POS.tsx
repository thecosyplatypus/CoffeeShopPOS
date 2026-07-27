import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { useSettingsStore } from '@/store/settings'
import { query } from '@/services/db'
import { processSale, addMenuItem, removeMenuItem, validateDiscount } from '@/services/inventory'
import { getCurrentUser } from '@/services/auth'
import { formatCurrency } from '@/utils/format'
import { Trash2, Plus, Minus, Receipt, Search, Coffee, X, CreditCard, Banknote, Smartphone } from 'lucide-react'
import type { MenuItem, Discount } from '@/types'

const categoryColors: Record<string, string> = {
  Coffee: 'bg-amber-700 hover:bg-amber-600',
  Specialty: 'bg-emerald-700 hover:bg-emerald-600',
  Food: 'bg-rose-700 hover:bg-rose-600',
}

export function POSPage() {
  const { cart, menuItems, addToCart, removeFromCart, updateQuantity, clearCart, setMenuItems } = useAppStore()
  const [activeCategory, setActiveCategory] = useState('Coffee')
  const [search, setSearch] = useState('')
  const [receipt, setReceipt] = useState<{ total: number; items: number } | null>(null)
  const [error, setError] = useState('')
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')
  const [manageMode, setManageMode] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash')
  const [discountCode, setDiscountCode] = useState('')
  const [appliedDiscount, setAppliedDiscount] = useState<Discount | null>(null)
  const [discountError, setDiscountError] = useState('')
  const taxRate = useSettingsStore((s) => s.taxRate)

  const reloadMenu = () => {
    const items = query<MenuItem>('SELECT * FROM menu_items WHERE active = 1 ORDER BY category, name')
    setMenuItems(items)
    if (items.length > 0) {
      const cats = [...new Set(items.map(i => i.category))]
      if (!cats.includes(activeCategory)) setActiveCategory(cats[0])
    }
  }

  useEffect(() => { reloadMenu() }, [])

  const filteredItems = menuItems.filter(
    (item) => item.category === activeCategory && item.name.toLowerCase().includes(search.toLowerCase())
  )

  const categories = [...new Set(menuItems.map((i) => i.category))]

  const cartTotal = cart.reduce((sum, ci) => sum + ci.menuItem.sellPrice * ci.quantity, 0)
  const cartItemCount = cart.reduce((sum, ci) => sum + ci.quantity, 0)
  const discountAmount = appliedDiscount
    ? appliedDiscount.type === 'percent'
      ? Math.round(cartTotal * (appliedDiscount.value / 100) * 100) / 100
      : Math.min(appliedDiscount.value, cartTotal)
    : 0
  const afterDiscount = Math.round((cartTotal - discountAmount) * 100) / 100
  const taxAmount = Math.round(afterDiscount * taxRate * 100) / 100
  const finalTotal = Math.round((afterDiscount + taxAmount) * 100) / 100

  const handleApplyDiscount = () => {
    setDiscountError('')
    setAppliedDiscount(null)
    if (!discountCode.trim()) return
    const d = validateDiscount(discountCode.trim(), cartTotal)
    if (!d) {
      setDiscountError('Invalid or expired discount code')
      return
    }
    setAppliedDiscount(d)
  }

  const handleCheckout = () => {
    if (cart.length === 0) return
    setError('')

    const user = getCurrentUser()
    if (!user) {
      setError('Please log in first')
      return
    }

    try {
      const results = processSale(
        cart.map((ci) => ({ menuItemId: ci.menuItem.id, quantity: ci.quantity })),
        user.id,
        paymentMethod,
        taxRate,
        discountCode.trim() || undefined
      )

      const errors = results.filter((r) => !r.success)
      if (errors.length > 0) {
        setError(errors[0].error || 'Stock error')
        return
      }

      setReceipt({ total: finalTotal, items: cartItemCount })
      clearCart()
      setAppliedDiscount(null)
      setDiscountCode('')
      setTimeout(() => setReceipt(null), 5000)
    } catch (err: any) {
      setError(err.message || 'Transaction failed')
    }
  }

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice) return
    const price = parseFloat(newItemPrice)
    if (isNaN(price) || price <= 0) return
    const cat = newItemCategory.trim() || 'Other'
    addMenuItem(newItemName.trim(), cat, price)
    setNewItemName('')
    setNewItemCategory('')
    setNewItemPrice('')
    setShowAddItem(false)
    reloadMenu()
  }

  const handleRemoveItem = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation()
    removeMenuItem(item.id)
    reloadMenu()
  }

  return (
    <div className="flex h-full bg-coffee-950">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b border-coffee-800">
          <div className="flex gap-2 mb-3">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeCategory === cat
                    ? 'bg-coffee-700 text-white'
                    : 'bg-coffee-900 text-coffee-400 hover:bg-coffee-800'
                }`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setManageMode(!manageMode)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                manageMode
                  ? 'bg-red-800 text-white hover:bg-red-700'
                  : 'bg-coffee-900 text-coffee-500 hover:bg-coffee-800 hover:text-coffee-300'
              }`}
            >
              {manageMode ? 'Done' : 'Manage'}
            </button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-coffee-900 border border-coffee-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-500"
              />
            </div>
            <button
              onClick={() => setShowAddItem(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-coffee-700 hover:bg-coffee-600 text-white transition-colors flex items-center gap-1.5"
            >
              <Plus size={16} /> Add Item
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => manageMode ? undefined : addToCart(item)}
                className={`bg-coffee-900 border rounded-xl p-4 text-center transition-all active:scale-95 touch-manipulation relative ${
                  manageMode ? 'border-red-800 hover:border-red-600' : 'border-coffee-800 hover:border-coffee-600'
                }`}
                style={{ minHeight: '90px' }}
              >
                {manageMode && (
                  <button
                    onClick={(e) => handleRemoveItem(e, item)}
                    className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-red-900 hover:bg-red-700 flex items-center justify-center z-10"
                  >
                    <X size={12} className="text-red-300" />
                  </button>
                )}
                <div className={`w-10 h-10 mx-auto mb-2 rounded-full ${categoryColors[item.category] || 'bg-coffee-700'} flex items-center justify-center`}>
                  <Coffee size={18} />
                </div>
                <div className="text-sm font-medium text-white leading-tight">{item.name}</div>
                <div className="text-coffee-400 text-sm mt-1">{formatCurrency(item.sellPrice)}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="w-80 bg-coffee-900 border-l border-coffee-800 flex flex-col">
        <div className="p-4 border-b border-coffee-800">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-white">Current Order</h2>
            <span className="text-coffee-400 text-sm">{cartItemCount} items</span>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-2">
          {cart.length === 0 && (
            <div className="text-center text-coffee-500 mt-8">
              <Receipt size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Tap items to add them</p>
            </div>
          )}

          {cart.map((ci) => (
            <div key={ci.menuItem.id} className="bg-coffee-950 rounded-lg p-3 border border-coffee-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white truncate mr-2">{ci.menuItem.name}</span>
                <button onClick={() => removeFromCart(ci.menuItem.id)} className="text-red-400 hover:text-red-300 p-0.5">
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQuantity(ci.menuItem.id, ci.quantity - 1)} className="w-7 h-7 rounded bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center">
                    <Minus size={14} />
                  </button>
                  <span className="text-white font-semibold w-6 text-center">{ci.quantity}</span>
                  <button onClick={() => updateQuantity(ci.menuItem.id, ci.quantity + 1)} className="w-7 h-7 rounded bg-coffee-800 hover:bg-coffee-700 flex items-center justify-center">
                    <Plus size={14} />
                  </button>
                </div>
                <span className="text-coffee-300 font-semibold">{formatCurrency(ci.menuItem.sellPrice * ci.quantity)}</span>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="px-4 py-2 bg-red-900/50 border-t border-red-800">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        )}

        {receipt && (
          <div className="px-4 py-2 bg-emerald-900/50 border-t border-emerald-800">
            <p className="text-emerald-300 text-sm">Sale complete — {formatCurrency(receipt.total)} ({receipt.items} items)</p>
          </div>
        )}

        <div className="p-4 border-t border-coffee-800 space-y-3">
          <div className="flex gap-1.5 mb-1">
            {([
              { key: 'cash' as const, label: 'Cash', Icon: Banknote },
              { key: 'card' as const, label: 'Card', Icon: CreditCard },
              { key: 'mobile' as const, label: 'Mobile', Icon: Smartphone },
            ]).map(({ key, label, Icon }) => (
              <button key={key} onClick={() => setPaymentMethod(key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                  paymentMethod === key ? 'bg-coffee-600 text-white' : 'bg-coffee-950 text-coffee-400 hover:bg-coffee-800'
                }`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input type="text" placeholder="Discount code" value={discountCode}
              onChange={(e) => setDiscountCode(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
              className="flex-1 bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-sm text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
            <button onClick={handleApplyDiscount}
              className="px-3 py-2 rounded-lg bg-coffee-700 hover:bg-coffee-600 text-white text-sm font-medium">
              Apply
            </button>
          </div>
          {discountError && <p className="text-red-400 text-xs">{discountError}</p>}
          {appliedDiscount && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-emerald-400">Discount ({appliedDiscount.code})</span>
              <span className="text-emerald-400">-{formatCurrency(discountAmount)}</span>
            </div>
          )}

          <div className="space-y-1 text-sm">
            <div className="flex justify-between text-coffee-400">
              <span>Subtotal</span>
              <span>{formatCurrency(cartTotal)}</span>
            </div>
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>Discount</span>
                <span>-{formatCurrency(discountAmount)}</span>
              </div>
            )}
            {taxRate > 0 && (
              <div className="flex justify-between text-coffee-400">
                <span>Tax ({(taxRate * 100).toFixed(1)}%)</span>
                <span>{formatCurrency(taxAmount)}</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-lg">
            <span className="text-coffee-400">Total</span>
            <span className="text-white font-bold text-2xl">{formatCurrency(finalTotal)}</span>
          </div>
          <div className="flex gap-2">
            <button onClick={clearCart} className="flex-1 py-3 rounded-lg border border-coffee-700 text-coffee-400 hover:bg-coffee-800 font-medium transition-colors">
              Clear
            </button>
            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="flex-[3] py-3 rounded-lg bg-coffee-600 hover:bg-coffee-500 disabled:bg-coffee-800 disabled:text-coffee-600 text-white font-semibold transition-colors"
            >
              Charge {formatCurrency(finalTotal)}
            </button>
          </div>
        </div>
      </div>

      {showAddItem && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-6 w-96">
            <h2 className="text-lg font-semibold text-white mb-4">Add Menu Item</h2>
            <div className="space-y-3">
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Name</label>
                <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Mocha, Iced Latte"
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Category</label>
                <input type="text" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)}
                  placeholder="e.g. Coffee, Specialty, Food"
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Price</label>
                <input type="number" step="0.01" min="0" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)}
                  placeholder="e.g. 4.50"
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddItem(false); setNewItemName(''); setNewItemCategory(''); setNewItemPrice('') }}
                className="flex-1 py-2.5 rounded-lg border border-coffee-700 text-coffee-400 hover:bg-coffee-800">Cancel</button>
              <button onClick={handleAddItem} disabled={!newItemName.trim() || !newItemPrice}
                className="flex-1 py-2.5 rounded-lg bg-coffee-600 hover:bg-coffee-500 disabled:bg-coffee-800 disabled:text-coffee-600 text-white font-medium">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
