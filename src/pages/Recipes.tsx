import { useState, useRef, useEffect } from 'react'
import { getAllRecipes, getRecipesForMenuItem, addRecipe, updateRecipe, deleteRecipe, addMenuItem } from '@/services/inventory'
import { getProductStockLevels } from '@/services/inventory'
import type { Product } from '@/types'
import type { RecipeRow } from '@/services/inventory'
import { formatCurrency } from '@/utils/format'
import { convert } from '@/utils/units'
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
  const [mobileShowDetail, setMobileShowDetail] = useState(false)
  const addFormRef = useRef<HTMLDivElement>(null)
  const [showAddItem, setShowAddItem] = useState(false)
  const [newItemName, setNewItemName] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')
  const [newItemPrice, setNewItemPrice] = useState('')

  useEffect(() => {
    if (showAdd && addFormRef.current) {
      addFormRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [showAdd])

  const selectedItem = menuItems.find(m => m.menuItemId === selectedId)

  const selectItem = (id: string) => {
    setSelectedId(id)
    setEditingId(null)
    setShowAdd(false)
    setError('')
    setRecipes(getRecipesForMenuItem(id))
    setMobileShowDetail(true)
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

  const existingCategories = [...new Set(menuItems.map(m => m.category))]

  const handleAddItem = () => {
    if (!newItemName.trim() || !newItemCategory.trim() || !newItemPrice) return
    const price = parseFloat(newItemPrice)
    if (isNaN(price) || price < 0) return
    const item = addMenuItem(newItemName.trim(), newItemCategory.trim(), price)
    if (!item) return
    setNewItemName('')
    setNewItemCategory('')
    setNewItemPrice('')
    setShowAddItem(false)
    setMenuItems(getAllRecipes())
    setSelectedId(item.id)
    setRecipes([])
    setMobileShowDetail(true)
  }

  const costPerServing = (r: RecipeRow) => {
    const product = products.find(p => p.id === r.productId)
    if (!product) return 0
    const convertedQty = convert(r.quantityUsed, r.unit as any, product.unit)
    return product.costPrice * convertedQty * (1 + r.wastePercent / 100)
  }

  const totalCost = recipes.reduce((sum, r) => sum + costPerServing(r), 0)
  const margin = selectedItem && selectedItem.sellPrice > 0
    ? ((selectedItem.sellPrice - totalCost) / selectedItem.sellPrice) * 100
    : null

  return (
    <>
    <div className="flex h-full">
      <div className={`${mobileShowDetail ? 'hidden' : 'flex'} md:flex md:w-80 w-full flex-col bg-white border-r border-gray-200`}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-base md:text-lg font-semibold text-gray-900 flex items-center gap-2">
              <ChefHat size={18} className="text-gray-400" /> Recipes
            </h2>
            <p className="text-gray-500 text-xs mt-1">{menuItems.length} menu items</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setShowAddItem(true)}
              className="btn-primary flex items-center gap-1 text-xs md:text-sm px-2.5 py-1.5 md:px-3">
              <Plus size={14} /> <span className="hidden sm:inline">New Item</span><span className="sm:hidden">New</span>
            </button>
            <button onClick={() => setMobileShowDetail(false)} className="md:hidden p-1 text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
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

      <div className={`${mobileShowDetail ? 'flex' : 'hidden'} md:flex flex-1 flex-col bg-gray-50 w-full`}>
        {selectedItem ? (
          <>
            <div className="p-4 border-b border-gray-200 bg-white flex items-center gap-3 md:gap-0 md:justify-between">
              <button onClick={() => setMobileShowDetail(false)} className="md:hidden text-gray-500 hover:text-gray-700 flex-shrink-0">
                <span className="text-sm font-medium">Back</span>
              </button>
              <div className="flex-1 min-w-0 md:flex-none">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 truncate">{selectedItem.menuItemName}</h2>
                <p className="text-gray-500 text-xs md:text-sm">
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
                className="btn-primary flex items-center gap-1.5 disabled:bg-gray-200 disabled:text-gray-400 text-xs md:text-sm flex-shrink-0"
              >
                <Plus size={16} /> Add
              </button>
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-50 border-b border-red-200">
                <p className="text-red-600 text-xs md:text-sm">{error}</p>
              </div>
            )}

            <div className="flex-1 overflow-auto p-3 md:p-4">
              {recipes.length === 0 && !showAdd ? (
                <div className="text-center text-gray-400 mt-12">
                  <ChefHat size={40} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs md:text-sm">No ingredients defined</p>
                  <p className="text-xs text-gray-400 mt-1">Tap the + Add button above to link products</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recipes.map(r => (
                    <div key={r.id} className="card p-2 md:p-3">
                      {editingId === r.id ? (
                        <div className="flex items-center gap-2 md:gap-3 flex-wrap md:flex-nowrap">
                          <div className="flex-1 text-xs md:text-sm font-medium text-gray-900 truncate">{r.productName}</div>
                          <input type="number" step="any" min="0" value={editQty} onChange={e => setEditQty(e.target.value)}
                            className="input-base w-16 md:w-20 text-xs md:text-sm" />
                          <select value={editUnit} onChange={e => setEditUnit(e.target.value)}
                            className="input-base w-auto text-xs md:text-sm">
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                          <input type="number" step="0.1" min="0" max="99" value={editWaste} onChange={e => setEditWaste(e.target.value)}
                            className="input-base w-14 md:w-16 text-xs md:text-sm" />
                          <span className="text-gray-400 text-xs">%</span>
                          <button onClick={() => saveEdit(r)} className="p-1 text-emerald-600 hover:text-emerald-700"><Check size={16} /></button>
                          <button onClick={() => setEditingId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X size={16} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <div className="text-xs md:text-sm font-medium text-gray-900 truncate">{r.productName}</div>
                            <div className="text-xs text-gray-500">
                              {r.quantityUsed} {r.unit}
                              {r.unit !== r.productUnit && (
                                <span className="text-gray-400 ml-1">
                                  (= {convert(r.quantityUsed, r.unit as any, r.productUnit as any)} {r.productUnit})
                                </span>
                              )}
                              {r.wastePercent > 0 && <span className="text-amber-600 ml-2">+{r.wastePercent}% waste</span>}
                              <span className="ml-2 text-gray-400">({formatCurrency(costPerServing(r))}/serve)</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
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
                    <div ref={addFormRef} className="card p-3 mt-2 border-coffee-200 bg-coffee-50/30">
                      <div className="text-xs text-gray-600 mb-2 font-medium">New Ingredient</div>
                      <div className="space-y-2">
                        <select value={addProductId} onChange={e => {
                          setAddProductId(e.target.value)
                          const prod = availableProducts.find(p => p.id === e.target.value)
                          if (prod) setAddUnit(prod.unit)
                        }}
                          className="input-base text-sm py-2.5">
                          {availableProducts.map(p => (
                            <option key={p.id} value={p.id}>{p.name} ({p.unit})</option>
                          ))}
                        </select>
                        <div className="flex items-center gap-2">
                          <input type="number" step="any" min="0" value={addQty} onChange={e => setAddQty(e.target.value)}
                            placeholder="Quantity"
                            className="input-base flex-1 text-sm py-2.5" />
                          <select value={addUnit} onChange={e => setAddUnit(e.target.value)}
                            className="input-base w-auto text-sm py-2.5">
                            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 flex items-center gap-1">
                            <input type="number" step="0.1" min="0" max="99" value={addWaste} onChange={e => setAddWaste(e.target.value)}
                              placeholder="0"
                              className="input-base w-20 text-sm py-2.5" />
                            <span className="text-gray-400 text-xs">% waste</span>
                          </div>
                          <button onClick={handleAdd} disabled={!addProductId || !addQty}
                            className="btn-primary px-5 py-2.5 text-sm">Add</button>
                          <button onClick={() => { setShowAdd(false); setError('') }}
                            className="btn-secondary px-4 py-2.5 text-sm">Cancel</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {recipes.length > 0 && (
              <div className="p-3 md:p-4 border-t border-gray-200 bg-white" style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}>
                <div className="flex items-center justify-between text-xs md:text-sm">
                  <span className="text-gray-500">Cost per serving</span>
                  <span className="text-gray-900 font-semibold">{formatCurrency(totalCost)}</span>
                </div>
                {margin !== null && (
                  <div className="flex items-center justify-between text-xs md:text-sm mt-1">
                    <span className="text-gray-500">Profit margin</span>
                    <span className={`font-semibold ${margin >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{margin.toFixed(1)}%</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <p className="text-sm md:text-base">Select a menu item to view its recipe</p>
          </div>
        )}
      </div>
    </div>

    {showAddItem && (
      <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
        <div className="card p-5 sm:p-6 w-full sm:w-96 shadow-modal sm:rounded-xl rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">New Menu Item</h2>
          <div className="space-y-3">
            <div>
              <label className="text-gray-700 text-sm block mb-1 font-medium">Name</label>
              <input type="text" value={newItemName} onChange={e => setNewItemName(e.target.value)}
                placeholder="e.g. Iced Latte, Croissant"
                className="input-base" autoFocus />
            </div>
            <div>
              <label className="text-gray-700 text-sm block mb-1 font-medium">Category</label>
              <input type="text" value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)}
                placeholder="e.g. Coffee, Pastry, Tea"
                className="input-base" list="recipe-categories" />
              <datalist id="recipe-categories">
                {existingCategories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className="text-gray-700 text-sm block mb-1 font-medium">Sell Price</label>
              <input type="number" step="0.01" min="0" value={newItemPrice} onChange={e => setNewItemPrice(e.target.value)}
                placeholder="0.00"
                className="input-base" />
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setShowAddItem(false); setNewItemName(''); setNewItemCategory(''); setNewItemPrice('') }}
              className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleAddItem} disabled={!newItemName.trim() || !newItemCategory.trim() || !newItemPrice}
              className="btn-primary flex-1">Create</button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
