import { useState } from 'react'
import { getAllRecipes, getRecipesForMenuItem, addRecipe, updateRecipe, deleteRecipe } from '@/services/inventory'
import { getProductStockLevels } from '@/services/inventory'
import type { Product } from '@/types'
import type { RecipeRow } from '@/services/inventory'
import { formatCurrency } from '@/utils/format'
import { ChefHat, Plus, Trash2, Pencil, X, Check } from 'lucide-react'

const UNITS = ['g', 'ml', 'kg', 'l', 'pcs', 'shots'] as const

interface MenuItemSummary {
  menuItemId: string
  menuItemName: string
  category: string
  sellPrice: number
  ingredients: number
}

export function RecipesPage() {
  const [menuItems, setMenuItems] = useState<MenuItemSummary[]>(() => getAllRecipes())
  const [selectedId, setSelectedId] = useState<string | null>(menuItems[0]?.menuItemId ?? null)
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [products] = useState<Product[]>(() => getProductStockLevels())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editQty, setEditQty] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editWaste, setEditWaste] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [addProductId, setAddProductId] = useState('')
  const [addQty, setAddQty] = useState('')
  const [addUnit, setAddUnit] = useState('g')
  const [addWaste, setAddWaste] = useState('0')
  const [error, setError] = useState('')

  const selectedItem = menuItems.find(m => m.menuItemId === selectedId)

  const selectItem = (id: string) => {
    setSelectedId(id)
    setEditingId(null)
    setShowAdd(false)
    setError('')
    setRecipes(getRecipesForMenuItem(id))
  }

  const refresh = () => {
    if (selectedId) setRecipes(getRecipesForMenuItem(selectedId))
    setMenuItems(getAllRecipes())
  }

  const usedProductIds = new Set(recipes.map(r => r.productId))
  const availableProducts = products.filter(p => !usedProductIds.has(p.id))

  const startEdit = (r: RecipeRow) => {
    setEditingId(r.id)
    setEditQty(String(r.quantityUsed))
    setEditUnit(r.unit)
    setEditWaste(String(r.wastePercent))
  }

  const saveEdit = (r: RecipeRow) => {
    const qty = parseFloat(editQty)
    const waste = parseFloat(editWaste)
    if (isNaN(qty) || qty <= 0 || isNaN(waste) || waste < 0 || waste >= 100) {
      setError('Invalid quantity or waste percentage')
      return
    }
    updateRecipe(r.id, qty, editUnit, waste)
    setEditingId(null)
    setError('')
    refresh()
  }

  const handleAdd = () => {
    if (!selectedId || !addProductId || !addQty) return
    const qty = parseFloat(addQty)
    const waste = parseFloat(addWaste) || 0
    if (isNaN(qty) || qty <= 0 || waste < 0 || waste >= 100) {
      setError('Invalid quantity or waste percentage')
      return
    }
    const ok = addRecipe(selectedId, addProductId, qty, addUnit, waste)
    if (!ok) {
      setError('This product is already in the recipe')
      return
    }
    setShowAdd(false)
    setAddProductId('')
    setAddQty('')
    setAddUnit('g')
    setAddWaste('0')
    setError('')
    refresh()
  }

  const handleDelete = (recipeId: string) => {
    deleteRecipe(recipeId)
    setError('')
    refresh()
  }

  const costPerServing = (r: RecipeRow) => {
    const product = products.find(p => p.id === r.productId)
    if (!product) return 0
    return product.costPrice * r.quantityUsed * (1 + r.wastePercent / 100)
  }

  const totalCost = recipes.reduce((sum, r) => sum + costPerServing(r), 0)
  const margin = selectedItem && selectedItem.sellPrice > 0
    ? ((selectedItem.sellPrice - totalCost) / selectedItem.sellPrice) * 100
    : null

  return (
    <div className="flex h-full">
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ChefHat size={18} className="text-gray-400" /> Recipes
          </h2>
          <p className="text-gray-500 text-xs mt-1">{menuItems.length} menu items</p>
        </div>
        <div className="flex-1 overflow-auto">
          {menuItems.map(mi => (
            <button
              key={mi.menuItemId}
              onClick={() => selectItem(mi.menuItemId)}
              className={`w-full text-left px-4 py-3 border-b border-gray-100 transition-colors ${
                selectedId === mi.menuItemId
                  ? 'bg-coffee-50 border-l-2 border-l-coffee-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-gray-900">{mi.menuItemName}</div>
                  <div className="text-xs text-gray-500">{mi.category}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  mi.ingredients > 0 ? 'bg-gray-100 text-gray-600' : 'bg-gray-50 text-gray-400'
                }`}>
                  {mi.ingredients}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-gray-50">
        {selectedItem ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedItem.menuItemName}</h2>
                <p className="text-gray-500 text-sm">
                  Sell price: {formatCurrency(selectedItem.sellPrice)}
                  {margin !== null && (
                    <span className={`ml-3 font-medium ${margin >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {margin.toFixed(0)}% margin
                    </span>
                  )}
                </p>
              </div>
              <button
                onClick={() => { setShowAdd(true); setAddProductId(availableProducts[0]?.id || ''); setError('') }}
                disabled={availableProducts.length === 0}
                className="btn-primary flex items-center gap-1.5 disabled:bg-gray-200 disabled:text-gray-400"
              >
                <Plus size={16} /> Add Ingredient
              </button>
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="flex-1 overflow-auto p-4">
              {recipes.length === 0 && !showAdd ? (
                <div className="text-center text-gray-400 mt-12">
                  <ChefHat size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No ingredients defined</p>
                  <p className="text-xs text-gray-400 mt-1">Click "Add Ingredient" to link products to this item</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipes.map(r => (
                    <div key={r.id} className="card p-3">
                      {editingId === r.id ? (
                        <div className="flex items-center gap-3">
                          <div className="flex-1 text-sm font-medium text-gray-900">{r.productName}</div>
                          <input type="number" step="any" min="0" value={editQty} onChange={e => setEditQty(e.target.value)}
                            className="input-base w-20 text-sm" />
                          <select value={editUnit} onChange={e => setEditUnit(e.target.value)}
                            className="input-base w-auto text-sm">
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input type="number" step="0.1" min="0" max="99" value={editWaste} onChange={e => setEditWaste(e.target.value)}
                            className="input-base w-16 text-sm" />
                          <span className="text-gray-400 text-xs">%</span>
                          <button onClick={() => saveEdit(r)} className="p-1 text-emerald-600 hover:text-emerald-700"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{r.productName}</div>
                            <div className="text-xs text-gray-500">
                              {r.quantityUsed} {r.unit}
                              {r.wastePercent > 0 && <span className="text-amber-600 ml-2">+{r.wastePercent}% waste</span>}
                              <span className="ml-2 text-gray-400">({formatCurrency(costPerServing(r))}/serve)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button onClick={() => startEdit(r)} className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors">
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => handleDelete(r.id)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                  {showAdd && (
                    <div className="card p-3 mt-2 border-coffee-200 bg-coffee-50/30">
                      <div className="text-xs text-gray-600 mb-2 font-medium">New Ingredient</div>
                      <div className="space-y-2">
                        <select value={addProductId} onChange={e => setAddProductId(e.target.value)}
                          className="input-base text-sm">
                          {availableProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <input type="number" step="any" min="0" value={addQty} onChange={e => setAddQty(e.target.value)}
                            placeholder="Quantity"
                            className="input-base flex-1 text-sm" />
                          <select value={addUnit} onChange={e => setAddUnit(e.target.value)}
                            className="input-base w-auto text-sm">
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1">
                            <input type="number" step="0.1" min="0" max="99" value={addWaste} onChange={e => setAddWaste(e.target.value)}
                              placeholder="0"
                              className="input-base w-20 text-sm" />
                            <span className="text-gray-400 text-sm">% waste</span>
                          </div>
                          <button onClick={handleAdd} disabled={!addProductId || !addQty}
                            className="btn-primary px-4 text-sm">Add</button>
                          <button onClick={() => { setShowAdd(false); setError('') }}
                            className="btn-secondary px-3 text-sm">Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {recipes.length > 0 && (
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Cost per serving</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(totalCost)}</span>
                </div>
                {margin !== null && (
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-500">Profit margin</span>
                    <span className={`font-semibold ${margin >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{margin.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p>Select a menu item to view its recipe</p>
          </div>
        )}
      </div>
    </div>
  )
}
