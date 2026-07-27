import { useEffect, useState } from 'react'
import { getProductStockLevels, adjustStock, addProduct, removeProduct, isProductInUse } from '@/services/inventory'
import { getCurrentUser } from '@/services/auth'
import { formatCurrency } from '@/utils/format'
import { Search, AlertTriangle, Plus, Trash2, X } from 'lucide-react'
import type { Product } from '@/types'

const UNITS = ['g', 'ml', 'kg', 'l', 'pcs', 'shots'] as const

export function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [adjustAmount, setAdjustAmount] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustBulkQty, setAdjustBulkQty] = useState('')
  const [adjustBulkPrice, setAdjustBulkPrice] = useState('')
  const [showAddProduct, setShowAddProduct] = useState(false)
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState<string>('pcs')
  const [newBulkQty, setNewBulkQty] = useState('')
  const [newBulkPrice, setNewBulkPrice] = useState('')
  const [newSellPrice, setNewSellPrice] = useState('')
  const [newStock, setNewStock] = useState('0')
  const [newMinStock, setNewMinStock] = useState('0')
  const [deleteError, setDeleteError] = useState('')

  const newCostPerUnit = newBulkQty && newBulkPrice && parseFloat(newBulkQty) > 0
    ? parseFloat(newBulkPrice) / parseFloat(newBulkQty)
    : null

  const adjustCostPerUnit = adjustBulkQty && adjustBulkPrice && parseFloat(adjustBulkQty) > 0
    ? parseFloat(adjustBulkPrice) / parseFloat(adjustBulkQty)
    : null

  const loadProducts = () => setProducts(getProductStockLevels())
  useEffect(() => { loadProducts() }, [])

  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()))

  const handleAdjust = () => {
    if (!selectedProduct || !adjustAmount || !adjustReason) return
    const user = getCurrentUser()
    if (!user) return
    const amount = parseFloat(adjustAmount)
    if (isNaN(amount) || amount === 0) return
    const bulkQty = adjustBulkQty ? parseFloat(adjustBulkQty) : undefined
    const bulkPrice = adjustBulkPrice ? parseFloat(adjustBulkPrice) : undefined
    const success = adjustStock(selectedProduct.id, amount, user.id, adjustReason, bulkQty, bulkPrice)
    if (success) {
      loadProducts()
      setSelectedProduct(null)
      setAdjustAmount('')
      setAdjustReason('')
      setAdjustBulkQty('')
      setAdjustBulkPrice('')
    }
  }

  const handleAddProduct = () => {
    if (!newName.trim() || !newBulkQty || !newBulkPrice) return
    const bulkQty = parseFloat(newBulkQty)
    const bulkPrice = parseFloat(newBulkPrice)
    const sell = newSellPrice ? parseFloat(newSellPrice) : null
    const stock = parseFloat(newStock) || 0
    const minStock = parseFloat(newMinStock) || 0
    if (isNaN(bulkQty) || bulkQty <= 0 || isNaN(bulkPrice) || bulkPrice < 0) return
    if (sell !== null && (isNaN(sell) || sell < 0)) return
    const cost = Math.round((bulkPrice / bulkQty) * 10000) / 10000
    addProduct(newName.trim(), newUnit, cost, sell, stock, minStock, bulkQty, bulkPrice)
    setNewName('')
    setNewUnit('pcs')
    setNewBulkQty('')
    setNewBulkPrice('')
    setNewSellPrice('')
    setNewStock('0')
    setNewMinStock('0')
    setShowAddProduct(false)
    loadProducts()
  }

  const handleRemove = (product: Product) => {
    setDeleteError('')
    if (isProductInUse(product.id)) {
      setDeleteError(`"${product.name}" is used in recipes and cannot be deleted.`)
      return
    }
    removeProduct(product.id)
    loadProducts()
  }

  const profit = (p: Product) => {
    if (p.sellPrice === null) return null
    return ((p.sellPrice - p.costPrice) / p.sellPrice) * 100
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Inventory</h1>
        <div className="flex gap-2">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" />
            <input type="text" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="bg-coffee-900 border border-coffee-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white placeholder-coffee-500 focus:outline-none focus:ring-2 focus:ring-coffee-500 w-64" />
          </div>
          <button
            onClick={() => setShowAddProduct(true)}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-coffee-700 hover:bg-coffee-600 text-white transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Product
          </button>
        </div>
      </div>

      {deleteError && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg px-4 py-3 flex items-center justify-between">
          <p className="text-red-300 text-sm">{deleteError}</p>
          <button onClick={() => setDeleteError('')} className="text-red-400 hover:text-red-300"><X size={16} /></button>
        </div>
      )}

      <div className="bg-coffee-900 border border-coffee-800 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-coffee-800 text-coffee-400 text-sm">
              <th className="text-left p-4">Product</th>
              <th className="text-right p-4">Stock Level</th>
              <th className="text-right p-4">Min Level</th>
              <th className="text-right p-4">Cost Price</th>
              <th className="text-right p-4">Sell Price</th>
              <th className="text-right p-4">Margin</th>
              <th className="text-right p-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const margin = profit(p)
              const isLow = p.stockLevel <= p.minStockLevel
              return (
                <tr key={p.id} className={`border-b border-coffee-800/50 hover:bg-coffee-800/50 ${isLow ? 'bg-amber-900/10' : ''}`}>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {isLow && <AlertTriangle size={14} className="text-amber-400" />}
                      <span className="text-white">{p.name}</span>
                    </div>
                  </td>
                  <td className={`p-4 text-right font-medium ${isLow ? 'text-amber-400' : 'text-coffee-200'}`}>{p.stockLevel} {p.unit}</td>
                  <td className="p-4 text-right text-coffee-400">{p.minStockLevel} {p.unit}</td>
                  <td className="p-4 text-right text-coffee-300">{formatCurrency(p.costPrice)}</td>
                  <td className="p-4 text-right text-coffee-300">{p.sellPrice !== null ? formatCurrency(p.sellPrice) : '—'}</td>
                  <td className="p-4 text-right">
                    {margin !== null ? (
                      <span className={margin > 50 ? 'text-emerald-400' : 'text-amber-400'}>{margin.toFixed(1)}%</span>
                    ) : <span className="text-coffee-500">—</span>}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setSelectedProduct(p)}
                        className="px-3 py-1.5 text-sm rounded-lg bg-coffee-800 hover:bg-coffee-700 text-coffee-300 transition-colors">Adjust</button>
                      <button onClick={() => handleRemove(p)}
                        className="p-1.5 rounded-lg bg-coffee-800 hover:bg-red-900 text-coffee-500 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-6 w-96">
            <h2 className="text-lg font-semibold text-white mb-1">Adjust Stock</h2>
            <p className="text-coffee-400 text-sm mb-4">{selectedProduct.name} ({selectedProduct.stockLevel} {selectedProduct.unit})</p>
            <div className="space-y-3">
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Adjustment (use negative for reduction)</label>
                <input type="number" step="any" value={adjustAmount} onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="e.g. 5000 or -500"
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Reason</label>
                <input type="text" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. New delivery, spillage"
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div className="bg-coffee-950 border border-coffee-700 rounded-lg p-3 space-y-3">
                <p className="text-coffee-300 text-sm font-medium">Restock Pricing (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-coffee-400 text-xs block mb-1">Quantity Received</label>
                    <input type="number" step="any" min="0" value={adjustBulkQty} onChange={(e) => setAdjustBulkQty(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500" />
                  </div>
                  <div>
                    <label className="text-coffee-400 text-xs block mb-1">Total Price Paid</label>
                    <input type="number" step="0.01" min="0" value={adjustBulkPrice} onChange={(e) => setAdjustBulkPrice(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500" />
                  </div>
                </div>
                {adjustCostPerUnit !== null && (
                  <p className="text-coffee-300 text-xs">New cost per unit: <span className="text-white font-medium">{formatCurrency(adjustCostPerUnit)}</span></p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setSelectedProduct(null)}
                className="flex-1 py-2.5 rounded-lg border border-coffee-700 text-coffee-400 hover:bg-coffee-800">Cancel</button>
              <button onClick={handleAdjust} disabled={!adjustAmount || !adjustReason}
                className="flex-1 py-2.5 rounded-lg bg-coffee-600 hover:bg-coffee-500 disabled:bg-coffee-800 disabled:text-coffee-600 text-white font-medium">Apply</button>
            </div>
          </div>
        </div>
      )}

      {showAddProduct && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-6 w-[28rem]">
            <h2 className="text-lg font-semibold text-white mb-4">Add Product</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-coffee-400 text-sm block mb-1">Name</label>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Oat Milk, Caramel Syrup"
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Unit</label>
                <select value={newUnit} onChange={(e) => setNewUnit(e.target.value)}
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-coffee-500">
                  {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Sell Price (optional)</label>
                <input type="number" step="0.01" min="0" value={newSellPrice} onChange={(e) => setNewSellPrice(e.target.value)}
                  placeholder="e.g. 0.10"
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Initial Stock</label>
                <input type="number" step="any" min="0" value={newStock} onChange={(e) => setNewStock(e.target.value)}
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div>
                <label className="text-coffee-400 text-sm block mb-1">Min Stock Level</label>
                <input type="number" step="any" min="0" value={newMinStock} onChange={(e) => setNewMinStock(e.target.value)}
                  className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
              </div>
              <div className="col-span-2 bg-coffee-950 border border-coffee-700 rounded-lg p-3 space-y-3">
                <p className="text-coffee-300 text-sm font-medium">Purchase Price</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-coffee-400 text-xs block mb-1">Quantity in Batch</label>
                    <input type="number" step="any" min="0" value={newBulkQty} onChange={(e) => setNewBulkQty(e.target.value)}
                      placeholder="e.g. 1000"
                      className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500" />
                  </div>
                  <div>
                    <label className="text-coffee-400 text-xs block mb-1">Total Price Paid</label>
                    <input type="number" step="0.01" min="0" value={newBulkPrice} onChange={(e) => setNewBulkPrice(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500" />
                  </div>
                </div>
                {newCostPerUnit !== null && (
                  <p className="text-coffee-300 text-xs">Cost per unit: <span className="text-white font-medium">{formatCurrency(newCostPerUnit)}</span></p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddProduct(false); setNewName(''); setNewBulkQty(''); setNewBulkPrice(''); setNewSellPrice(''); setNewStock('0'); setNewMinStock('0') }}
                className="flex-1 py-2.5 rounded-lg border border-coffee-700 text-coffee-400 hover:bg-coffee-800">Cancel</button>
              <button onClick={handleAddProduct} disabled={!newName.trim() || !newBulkQty || !newBulkPrice}
                className="flex-1 py-2.5 rounded-lg bg-coffee-600 hover:bg-coffee-500 disabled:bg-coffee-800 disabled:text-coffee-600 text-white font-medium">Add Product</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
