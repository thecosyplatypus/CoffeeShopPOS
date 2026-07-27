import { useEffect, useState } from 'react'
import { query } from '@/services/db'
import { getUsers, addUser, hasRole } from '@/services/auth'
import { configureSync, processSync, getPendingSyncItems } from '@/services/sync'
import { addSupplier, getSuppliers, deleteSupplier, addDiscount, getDiscounts, deleteDiscount, logWaste, getWasteLogs, addSupplierProduct, getSupplierProducts, getProductStockLevels } from '@/services/inventory'
import { useAppStore } from '@/store'
import { getCurrentUser } from '@/services/auth'
import type { User, UserRole, Supplier, Discount, Product } from '@/types'
import { Users, Database, RefreshCw, Server, Key, UserPlus, Truck, Tag, Trash2, Package } from 'lucide-react'

export function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [syncItems, setSyncItems] = useState<any[]>([])
  const [apiUrl, setApiUrl] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [showAddUser, setShowAddUser] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPin, setNewPin] = useState('')
  const [newRole, setNewRole] = useState<UserRole>('barista')
  const [stats, setStats] = useState({ products: 0, menuItems: 0, recipes: 0, transactions: 0 })
  const currentUser = useAppStore((s) => s.user)

  const [tab, setTab] = useState<'staff' | 'suppliers' | 'discounts' | 'waste'>('staff')

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [showAddSupplier, setShowAddSupplier] = useState(false)
  const [supName, setSupName] = useState('')
  const [supContact, setSupContact] = useState('')
  const [supPhone, setSupPhone] = useState('')
  const [supEmail, setSupEmail] = useState('')
  const [supAddress, setSupAddress] = useState('')

  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [showAddDiscount, setShowAddDiscount] = useState(false)
  const [dscCode, setDscCode] = useState('')
  const [dscType, setDscType] = useState<'percent' | 'fixed'>('percent')
  const [dscValue, setDscValue] = useState('')
  const [dscMinOrder, setDscMinOrder] = useState('')
  const [dscMaxUses, setDscMaxUses] = useState('')
  const [dscExpires, setDscExpires] = useState('')

  const [wasteProducts, setWasteProducts] = useState<Product[]>([])
  const [wasteProductId, setWasteProductId] = useState('')
  const [wasteQty, setWasteQty] = useState('')
  const [wasteReason, setWasteReason] = useState('')
  const [wasteLogs, setWasteLogs] = useState<any[]>([])

  const [loadError, setLoadError] = useState('')

  const loadData = () => {
    try {
      setUsers(getUsers())
      setSyncItems(getPendingSyncItems())
      const counts = {
        products: (query('SELECT COUNT(*) as c FROM products')[0] as any)?.c || 0,
        menuItems: (query('SELECT COUNT(*) as c FROM menu_items')[0] as any)?.c || 0,
        recipes: (query('SELECT COUNT(*) as c FROM recipes')[0] as any)?.c || 0,
        transactions: (query('SELECT COUNT(*) as c FROM transactions')[0] as any)?.c || 0,
      }
      setStats(counts)
      setSuppliers(getSuppliers())
      setDiscounts(getDiscounts())
      setWasteProducts(getProductStockLevels())
      setWasteLogs(getWasteLogs())
      setLoadError('')
    } catch (err: any) {
      console.error('[Admin] Failed to load data:', err)
      setLoadError(err?.message || 'Failed to load admin data')
    }
  }

  useEffect(() => { loadData() }, [])

  const handleConfigureSync = () => {
    if (!apiUrl) return
    configureSync({ pushUrl: `${apiUrl}/sync/push`, pullUrl: `${apiUrl}/sync/pull`, apiKey: apiKey || 'default-key' })
  }

  const handleManualSync = async () => {
    await processSync()
    loadData()
  }

  const handleAddUser = async () => {
    if (!newName.trim() || newPin.length < 4) return
    try {
      await addUser(newName.trim(), newRole, newPin)
      setShowAddUser(false)
      setNewName('')
      setNewPin('')
      loadData()
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleAddSupplier = () => {
    if (!supName.trim()) return
    addSupplier(supName.trim(), supContact, supPhone, supEmail, supAddress)
    setSupName(''); setSupContact(''); setSupPhone(''); setSupEmail(''); setSupAddress('')
    setShowAddSupplier(false)
    loadData()
  }

  const handleAddDiscount = () => {
    if (!dscCode.trim() || !dscValue) return
    const val = parseFloat(dscValue)
    if (isNaN(val) || val <= 0) return
    addDiscount(dscCode.trim(), dscType, val, parseFloat(dscMinOrder) || 0, dscMaxUses ? parseInt(dscMaxUses) : undefined, dscExpires || undefined)
    setDscCode(''); setDscValue(''); setDscMinOrder(''); setDscMaxUses(''); setDscExpires('')
    setShowAddDiscount(false)
    loadData()
  }

  const handleLogWaste = () => {
    if (!wasteProductId || !wasteQty || !wasteReason.trim()) return
    const user = getCurrentUser()
    if (!user) return
    const qty = parseFloat(wasteQty)
    if (isNaN(qty) || qty <= 0) return
    logWaste(wasteProductId, qty, wasteReason.trim(), user.id)
    setWasteQty(''); setWasteReason('')
    loadData()
  }

  const isOwner = currentUser?.role === 'owner'

  if (loadError) {
    return (
      <div className="p-4 md:p-6">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 mb-4">Administration</h1>
        <div className="card p-4 md:p-5 border-red-200 bg-red-50">
          <p className="text-red-700 font-semibold mb-2">Failed to load admin data</p>
          <p className="text-red-600 text-sm">{loadError}</p>
          <button onClick={loadData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <h1 className="text-xl md:text-2xl font-bold text-gray-900">Administration</h1>

      <div className="flex gap-2 overflow-x-auto flex-nowrap">
        {([
          { key: 'staff' as const, label: 'Staff', icon: Users },
          { key: 'suppliers' as const, label: 'Suppliers', icon: Truck },
          { key: 'discounts' as const, label: 'Discounts', icon: Tag },
          { key: 'waste' as const, label: 'Waste Log', icon: Trash2 },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs md:text-sm font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap ${tab === t.key ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <Database size={20} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Database Stats</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Products', value: stats.products },
              { label: 'Menu Items', value: stats.menuItems },
              { label: 'Recipes', value: stats.recipes },
              { label: 'Transactions', value: stats.transactions },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center border border-gray-100">
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-gray-500 text-xs mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <Server size={20} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Cloud Sync</h2>
          </div>
          <div className="space-y-3 mb-4">
            <input type="text" placeholder="Supabase/Firebase API URL" value={apiUrl} onChange={(e) => setApiUrl(e.target.value)}
              className="input-base" />
            <input type="text" placeholder="API Key (optional)" value={apiKey} onChange={(e) => setApiKey(e.target.value)}
              className="input-base" />
          </div>
          <div className="flex gap-2 mb-4">
            <button onClick={handleConfigureSync} disabled={!apiUrl}
              className="btn-primary disabled:bg-gray-200 disabled:text-gray-400">
              <Key size={14} className="inline mr-1" /> Configure</button>
            <button onClick={handleManualSync}
              className="btn-primary">
              <RefreshCw size={14} className="inline mr-1" /> Sync Now</button>
          </div>
          {syncItems.length > 0 && (
            <div>
              <p className="text-gray-500 text-xs mb-2">{syncItems.length} pending items</p>
              <div className="max-h-24 overflow-auto space-y-1">
                {syncItems.slice(0, 10).map((item: any) => (
                  <div key={item.id} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1 border border-gray-100">{item.operation} {item.tableName} ({item.retryCount} retries)</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {tab === 'staff' && (
        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Staff Management</h2>
            </div>
            {isOwner && (
              <button onClick={() => setShowAddUser(true)}
                className="btn-primary flex items-center gap-1">
                <UserPlus size={16} /> Add Staff
              </button>
            )}
          </div>

          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 text-sm">
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-left p-3 font-medium">Role</th>
                  <th className="text-left p-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-gray-100">
                    <td className="p-3 text-gray-900 font-medium">{u.name}</td>
                    <td className="p-3">
                      <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${u.role === 'owner' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' : u.role === 'manager' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'}`}>{u.role}</span>
                    </td>
                    <td className="p-3 text-gray-500 text-sm">{u.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div>
                  <p className="text-gray-900 font-medium">{u.name}</p>
                  <span className={`text-xs font-semibold uppercase px-2 py-1 rounded-full ${u.role === 'owner' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-200' : u.role === 'manager' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-gray-100 text-gray-600 ring-1 ring-gray-200'}`}>{u.role}</span>
                  <p className="text-gray-500 text-xs mt-1">{u.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'suppliers' && (
        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Truck size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Suppliers</h2>
            </div>
            <button onClick={() => setShowAddSupplier(true)}
              className="btn-primary flex items-center gap-1">
              <Truck size={16} /> Add Supplier
            </button>
          </div>
          {suppliers.length === 0 ? (
            <p className="text-gray-400 text-sm">No suppliers added yet</p>
          ) : (
            <div className="space-y-3">
              {suppliers.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 md:p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-gray-900 font-medium">{s.name}</p>
                    <p className="text-gray-500 text-xs">{s.contactName || ''} {s.phone || ''} {s.email || ''}</p>
                  </div>
                  <button onClick={() => { deleteSupplier(s.id); loadData() }}
                    className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'discounts' && (
        <div className="card p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Tag size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Discounts</h2>
            </div>
            <button onClick={() => setShowAddDiscount(true)}
              className="btn-primary flex items-center gap-1">
              <Tag size={16} /> Add Discount
            </button>
          </div>
          {discounts.length === 0 ? (
            <p className="text-gray-400 text-sm">No discounts created yet</p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-sm">
                      <th className="text-left p-3 font-medium">Code</th>
                      <th className="text-left p-3 font-medium">Type</th>
                      <th className="text-right p-3 font-medium">Value</th>
                      <th className="text-right p-3 font-medium">Min Order</th>
                      <th className="text-right p-3 font-medium">Uses</th>
                      <th className="text-right p-3 font-medium">Expires</th>
                      <th className="text-right p-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {discounts.map(d => (
                      <tr key={d.id} className="border-b border-gray-100">
                        <td className="p-3 text-gray-900 font-mono font-bold">{d.code}</td>
                        <td className="p-3">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${d.type === 'percent' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>{d.type}</span>
                        </td>
                        <td className="p-3 text-right text-gray-700">{d.type === 'percent' ? `${d.value}%` : `$${d.value.toFixed(2)}`}</td>
                        <td className="p-3 text-right text-gray-700">{d.minOrder > 0 ? `$${d.minOrder.toFixed(2)}` : '—'}</td>
                        <td className="p-3 text-right text-gray-700">{d.uses}{d.maxUses ? `/${d.maxUses}` : ''}</td>
                        <td className="p-3 text-right text-gray-500 text-xs">{d.expiresAt || '—'}</td>
                        <td className="p-3 text-right">
                          <button onClick={() => { deleteDiscount(d.id); loadData() }}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden space-y-3">
                {discounts.map(d => (
                  <div key={d.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-900 font-mono font-bold">{d.code}</span>
                      <button onClick={() => { deleteDiscount(d.id); loadData() }}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded-full ${d.type === 'percent' ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-200' : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'}`}>{d.type}</span>
                      <span className="text-sm text-gray-700 font-medium">{d.type === 'percent' ? `${d.value}%` : `$${d.value.toFixed(2)}`}</span>
                      <span className="text-xs text-gray-500">{d.uses}{d.maxUses ? `/${d.maxUses}` : ''} uses</span>
                      <span className="text-xs text-gray-500">{d.expiresAt || 'No expiry'}</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {tab === 'waste' && (
        <div className="space-y-4 md:space-y-6">
          <div className="card p-4 md:p-5">
            <div className="flex items-center gap-3 mb-4">
              <Package size={20} className="text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">Log Waste</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <select value={wasteProductId} onChange={e => setWasteProductId(e.target.value)}
                className="input-base text-sm">
                <option value="">Select product...</option>
                {wasteProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.stockLevel} {p.unit})</option>
                ))}
              </select>
              <input type="number" step="0.1" min="0" value={wasteQty} onChange={e => setWasteQty(e.target.value)}
                placeholder="Quantity" className="input-base text-sm" />
              <input type="text" value={wasteReason} onChange={e => setWasteReason(e.target.value)}
                placeholder="Reason (e.g. spilled, expired)" className="input-base text-sm" />
              <button onClick={handleLogWaste} disabled={!wasteProductId || !wasteQty || !wasteReason.trim()}
                className="btn-primary">
                Log Waste
              </button>
            </div>
          </div>

          <div className="card p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Waste History</h2>
            {wasteLogs.length === 0 ? (
              <p className="text-gray-400 text-sm">No waste logged yet</p>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-500 text-sm">
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Product</th>
                        <th className="text-right p-3 font-medium">Quantity</th>
                        <th className="text-left p-3 font-medium">Reason</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wasteLogs.slice(0, 20).map(w => (
                        <tr key={w.id} className="border-b border-gray-100">
                          <td className="p-3 text-gray-500 text-sm">{w.createdAt}</td>
                          <td className="p-3 text-gray-900 font-medium">{w.productName}</td>
                          <td className="p-3 text-right text-red-500">{w.quantity}</td>
                          <td className="p-3 text-gray-700">{w.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden space-y-3">
                  {wasteLogs.slice(0, 20).map(w => (
                    <div key={w.id} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gray-900 font-medium">{w.productName}</span>
                        <span className="text-red-500 font-medium text-sm">-{w.quantity}</span>
                      </div>
                      <p className="text-gray-700 text-sm">{w.reason}</p>
                      <p className="text-gray-500 text-xs mt-1">{w.createdAt}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showAddUser && isOwner && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="card p-6 w-full sm:w-96 shadow-modal rounded-t-xl sm:rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Staff Member</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)}
                className="input-base" />
              <input type="password" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="PIN" value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-base" />
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}
                className="input-base">
                <option value="barista">Barista</option>
                <option value="manager">Manager</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddUser(false)}
                className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddUser} disabled={!newName.trim() || newPin.length < 4}
                className="btn-primary flex-1">Add</button>
            </div>
          </div>
        </div>
      )}

      {showAddSupplier && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="card p-6 w-full sm:w-96 shadow-modal rounded-t-xl sm:rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Supplier</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Supplier Name" value={supName} onChange={e => setSupName(e.target.value)}
                className="input-base" />
              <input type="text" placeholder="Contact Name" value={supContact} onChange={e => setSupContact(e.target.value)}
                className="input-base" />
              <input type="text" placeholder="Phone" value={supPhone} onChange={e => setSupPhone(e.target.value)}
                className="input-base" />
              <input type="email" placeholder="Email" value={supEmail} onChange={e => setSupEmail(e.target.value)}
                className="input-base" />
              <input type="text" placeholder="Address" value={supAddress} onChange={e => setSupAddress(e.target.value)}
                className="input-base" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddSupplier(false)}
                className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddSupplier} disabled={!supName.trim()}
                className="btn-primary flex-1">Add</button>
            </div>
          </div>
        </div>
      )}

      {showAddDiscount && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="card p-6 w-full sm:w-96 shadow-modal rounded-t-xl sm:rounded-xl">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Create Discount</h2>
            <div className="space-y-3">
              <input type="text" placeholder="Code (e.g. SUMMER20)" value={dscCode} onChange={e => setDscCode(e.target.value.toUpperCase())}
                className="input-base font-mono" />
              <div className="flex gap-2">
                <button onClick={() => setDscType('percent')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${dscType === 'percent' ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>Percent %</button>
                <button onClick={() => setDscType('fixed')}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${dscType === 'fixed' ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 border border-gray-300'}`}>Fixed $</button>
              </div>
              <input type="number" step="0.01" min="0" value={dscValue} onChange={e => setDscValue(e.target.value)}
                placeholder={dscType === 'percent' ? 'Percentage (e.g. 20)' : 'Amount (e.g. 5.00)'}
                className="input-base" />
              <input type="number" step="0.01" min="0" value={dscMinOrder} onChange={e => setDscMinOrder(e.target.value)}
                placeholder="Minimum order (optional)" className="input-base" />
              <input type="number" min="0" value={dscMaxUses} onChange={e => setDscMaxUses(e.target.value)}
                placeholder="Max uses (optional)" className="input-base" />
              <input type="date" value={dscExpires} onChange={e => setDscExpires(e.target.value)}
                className="input-base" />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddDiscount(false)}
                className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddDiscount} disabled={!dscCode.trim() || !dscValue}
                className="btn-primary flex-1">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
