import { useEffect, useState } from 'react'
import { useAppStore } from '@/store'
import { useSettingsStore } from '@/store/settings'
import { query } from '@/services/db'
import { processSale, addMenuItem, removeMenuItem, validateDiscount } from '@/services/inventory'
import { getCurrentUser } from '@/services/auth'
import { formatCurrency } from '@/utils/format'
import { Trash2, Plus, Minus, Receipt, Search, Coffee, X, CreditCard, Banknote, Smartphone, ChevronUp, Settings } from 'lucide-react'
import type { MenuItem, Discount } from '@/types'

const categoryColors: Record<string, string> = {
  Coffee: 'bg-amber-50 text-amber-700 ring-amber-200',
  Specialty: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  Food: 'bg-rose-50 text-rose-700 ring-rose-200',
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
  const [cartOpen, setCartOpen] = useState(false)
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
    if (!user) { setError('Please log in first'); return }
    try {
      const results = processSale(
        cart.map((ci) => ({ menuItemId: ci.menuItem.id, quantity: ci.quantity })),
        user.id, paymentMethod, taxRate, discountCode.trim() || undefined
      )
      const errors = results.filter((r) => !r.success)
      if (errors.length > 0) { setError(errors[0].error || 'Stock error'); return }
      setReceipt({ total: finalTotal, items: cartItemCount })
      clearCart()
      setAppliedDiscount(null)
      setDiscountCode('')
      setCartOpen(false)
      setTimeout(() => setReceipt(null), 5000)
    } catch (err: any) { setError(err.message || 'Transaction failed') }
  }

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemPrice) return
    const price = parseFloat(newItemPrice)
    if (isNaN(price) || price <= 0) return
    const cat = newItemCategory.trim() || 'Other'
    addMenuItem(newItemName.trim(), cat, price)
    setNewItemName(''); setNewItemCategory(''); setNewItemPrice('')
    setShowAddItem(false)
    reloadMenu()
  }

  const handleRemoveItem = (e: React.MouseEvent, item: MenuItem) => {
    e.stopPropagation()
    removeMenuItem(item.id)
    reloadMenu()
  }

  /* ── Shared: category bar ── */
  const CategoryBar = () => (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
      {categories.map((cat) => (
        <button key={cat} onClick={() => setActiveCategory(cat)}
          className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors shrink-0 ${
            activeCategory === cat
              ? 'bg-coffee-600 text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}>{cat}</button>
      ))}
    </div>
  )

  /* ── Shared: menu item grid ── */
  const MenuGrid = () => (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3">
      {filteredItems.map((item) => (
        <button key={item.id}
          onClick={() => manageMode ? undefined : addToCart(item)}
          className={`bg-white border border-gray-200 rounded-xl p-3 text-center active:scale-95 transition-all touch-manipulation relative ${
            manageMode ? 'border-red-200 hover:border-red-400' : 'hover:shadow-card-hover'
          }`} style={{ minHeight: '80px' }}>
          {manageMode && (
            <button onClick={(e) => handleRemoveItem(e, item)}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center z-10">
              <X size={10} className="text-red-500" />
            </button>
          )}
          <div className={`w-9 h-9 mx-auto mb-1.5 rounded-full ${categoryColors[item.category] || 'bg-gray-100 text-gray-600 ring-gray-200'} ring-1 flex items-center justify-center`}>
            <Coffee size={16} />
          </div>
          <div className="text-xs md:text-sm font-medium text-gray-900 leading-tight">{item.name}</div>
          <div className="text-gray-500 text-xs md:text-sm mt-0.5">{formatCurrency(item.sellPrice)}</div>
        </button>
      ))}
    </div>
  )

  /* ── Shared: cart panel content ── */
  const CartContent = () => (
    <>
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {cart.length === 0 && (
          <div className="text-center text-gray-400 mt-8">
            <Receipt size={40} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Tap items to add them</p>
          </div>
        )}
        {cart.map((ci) => (
          <div key={ci.menuItem.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-900 truncate mr-2">{ci.menuItem.name}</span>
              <button onClick={() => removeFromCart(ci.menuItem.id)} className="text-gray-400 hover:text-red-500 p-0.5"><Trash2 size={14} /></button>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={() => updateQuantity(ci.menuItem.id, ci.quantity - 1)}
                  className="w-7 h-7 rounded-md bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center"><Minus size={14} className="text-gray-600" /></button>
                <span className="text-gray-900 font-semibold w-6 text-center">{ci.quantity}</span>
                <button onClick={() => updateQuantity(ci.menuItem.id, ci.quantity + 1)}
                  className="w-7 h-7 rounded-md bg-white border border-gray-300 hover:bg-gray-50 flex items-center justify-center"><Plus size={14} className="text-gray-600" /></button>
              </div>
              <span className="text-gray-900 font-semibold text-sm">{formatCurrency(ci.menuItem.sellPrice * ci.quantity)}</span>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="px-4 py-2 bg-red-50 border-t border-red-200"><p className="text-red-600 text-sm">{error}</p></div>}
      {receipt && <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200"><p className="text-emerald-700 text-sm">Sale complete — {formatCurrency(receipt.total)} ({receipt.items} items)</p></div>}

      <div className="p-4 border-t border-gray-200 space-y-3">
        <div className="flex gap-1.5">
          {([
            { key: 'cash' as const, label: 'Cash', Icon: Banknote },
            { key: 'card' as const, label: 'Card', Icon: CreditCard },
            { key: 'mobile' as const, label: 'Mobile', Icon: Smartphone },
          ]).map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setPaymentMethod(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                paymentMethod === key ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}><Icon size={14} /> {label}</button>
          ))}
        </div>

        <div className="flex gap-2">
          <input type="text" placeholder="Discount code" value={discountCode}
            onChange={(e) => setDiscountCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApplyDiscount()}
            className="input-base flex-1" />
          <button onClick={handleApplyDiscount} className="btn-primary px-3">Apply</button>
        </div>
        {discountError && <p className="text-red-500 text-xs">{discountError}</p>}
        {appliedDiscount && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-emerald-600">Discount ({appliedDiscount.code})</span>
            <span className="text-emerald-600 font-medium">-{formatCurrency(discountAmount)}</span>
          </div>
        )}

        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>{formatCurrency(cartTotal)}</span></div>
          {discountAmount > 0 && <div className="flex justify-between text-emerald-600"><span>Discount</span><span>-{formatCurrency(discountAmount)}</span></div>}
          {taxRate > 0 && <div className="flex justify-between text-gray-500"><span>Tax ({(taxRate * 100).toFixed(1)}%)</span><span>{formatCurrency(taxAmount)}</span></div>}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-gray-500">Total</span>
          <span className="text-gray-900 font-bold text-xl md:text-2xl">{formatCurrency(finalTotal)}</span>
        </div>

        <div className="flex gap-2">
          <button onClick={clearCart} className="btn-secondary flex-1 py-3">Clear</button>
          <button onClick={handleCheckout} disabled={cart.length === 0}
            className="btn-primary flex-[3] py-3 text-base font-semibold">Charge {formatCurrency(finalTotal)}</button>
        </div>
      </div>
    </>
  )

  return (
    <div className="flex h-full bg-gray-50">
      {/* ── Desktop layout ── */}
      <div className="hidden md:flex flex-1 flex-col">
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="flex gap-2 mb-3"><CategoryBar /></div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search menu items..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-9" />
            </div>
            <button onClick={() => setShowAddItem(true)} className="btn-primary flex items-center gap-1.5"><Plus size={16} /> Add Item</button>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4"><MenuGrid /></div>
      </div>

      <div className="hidden md:flex w-80 bg-white border-l border-gray-200 flex-col">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Current Order</h2>
          <span className="text-gray-500 text-sm">{cartItemCount} items</span>
        </div>
        <CartContent />
      </div>

      {/* ── Mobile layout ── */}
      <div className="flex flex-col flex-1 md:hidden">
        {/* Header bar */}
        <div className="p-3 bg-white border-b border-gray-200 space-y-2">
          <div className="flex items-center gap-2">
            <CategoryBar />
            <button onClick={() => setManageMode(!manageMode)}
              className={`p-2 rounded-full shrink-0 transition-colors ${
                manageMode ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
              }`}><Settings size={16} /></button>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-base pl-9 text-sm" />
            </div>
            <button onClick={() => setShowAddItem(true)} className="btn-primary px-3 flex items-center gap-1">
              <Plus size={16} /> <span className="hidden sm:inline">Add</span>
            </button>
          </div>
        </div>

        {/* Menu grid — scrollable, padded for floating cart */}
        <div className="flex-1 overflow-auto p-3 pb-20"><MenuGrid /></div>

        {/* Floating cart bar */}
        {cart.length > 0 && (
          <button onClick={() => setCartOpen(true)}
            className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px)+4px)] inset-x-3 bg-coffee-600 text-white rounded-xl px-4 py-3 flex items-center justify-between shadow-lg z-30 active:bg-coffee-700 transition-colors"
            style={{ height: '56px' }}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-coffee-500 flex items-center justify-center text-xs font-bold">{cartItemCount}</div>
              <span className="font-medium">View Order</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg">{formatCurrency(finalTotal)}</span>
              <ChevronUp size={18} />
            </div>
          </button>
        )}

        {/* Cart bottom sheet */}
        {cartOpen && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setCartOpen(false)} />
            <div className="fixed inset-x-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-50 flex flex-col"
              style={{ maxHeight: '85vh' }}>
              {/* Drag handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-gray-300" />
              </div>
              {/* Sheet header */}
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200">
                <h2 className="font-semibold text-gray-900">Current Order</h2>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 text-sm">{cartItemCount} items</span>
                  <button onClick={() => setCartOpen(false)} className="p-1 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
              </div>
              {/* Scrollable cart content */}
              <CartContent />
            </div>
          </>
        )}
      </div>

      {/* Add item modal (shared) */}
      {showAddItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-modal">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Menu Item</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-700 text-sm block mb-1 font-medium">Name</label>
                <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="e.g. Mocha, Iced Latte" className="input-base" />
              </div>
              <div>
                <label className="text-gray-700 text-sm block mb-1 font-medium">Category</label>
                <input type="text" value={newItemCategory} onChange={(e) => setNewItemCategory(e.target.value)} placeholder="e.g. Coffee, Specialty, Food" className="input-base" />
              </div>
              <div>
                <label className="text-gray-700 text-sm block mb-1 font-medium">Price</label>
                <input type="number" step="0.01" min="0" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} placeholder="e.g. 4.50" className="input-base" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddItem(false); setNewItemName(''); setNewItemCategory(''); setNewItemPrice('') }} className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddItem} disabled={!newItemName.trim() || !newItemPrice} className="btn-primary flex-1">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
