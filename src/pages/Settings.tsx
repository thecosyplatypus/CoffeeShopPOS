import { useRef, useState } from 'react'
import { useSettingsStore } from '@/store/settings'
import { getDb } from '@/services/db'
import { Download, Upload, Check, X, AlertTriangle, Trash2 } from 'lucide-react'

const CURRENCY_PRESETS = [
  { symbol: '$', label: 'USD ($)' },
  { symbol: '€', label: 'EUR (€)' },
  { symbol: '£', label: 'GBP (£)' },
  { symbol: '¥', label: 'JPY/CNY (¥)' },
  { symbol: '₹', label: 'INR (₹)' },
  { symbol: '₩', label: 'KRW (₩)' },
  { symbol: 'R', label: 'ZAR (R)' },
  { symbol: 'A$', label: 'AUD (A$)' },
  { symbol: 'C$', label: 'CAD (C$)' },
]

const TABLES = ['users', 'products', 'menu_items', 'recipes', 'transactions', 'transaction_items', 'inventory_logs', 'expenses', 'sync_queue', 'suppliers', 'supplier_products', 'waste_logs', 'discounts']
const DELETE_ORDER = ['sync_queue', 'transaction_items', 'inventory_logs', 'waste_logs', 'supplier_products', 'expenses', 'recipes', 'discounts', 'transactions', 'suppliers', 'menu_items', 'products', 'users']

export function SettingsPage() {
  const settings = useSettingsStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [exportMsg, setExportMsg] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetStep, setResetStep] = useState(0)
  const [resetConfirm, setResetConfirm] = useState('')
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const handleExport = () => {
    try {
      const db = getDb()
      const data: Record<string, any[]> = {}
      for (const table of TABLES) {
        const rows = db.exec(`SELECT * FROM ${table}`)
        if (rows.length > 0) {
          const cols = rows[0].columns
          data[table] = rows[0].values.map((row) => {
            const obj: Record<string, any> = {}
            cols.forEach((c, i) => { obj[c] = row[i] })
            return obj
          })
        } else {
          data[table] = []
        }
      }
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `coffeeshop-backup-${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      setExportMsg('Data exported successfully')
      setTimeout(() => setExportMsg(null), 3000)
    } catch (err: any) {
      setExportMsg('Export failed: ' + (err.message || 'Unknown error'))
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportMsg(null)
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string)
        const db = getDb()
        db.run('BEGIN TRANSACTION')
        try {
          for (const table of DELETE_ORDER) {
            if (!data[table] || !Array.isArray(data[table])) continue
            db.run(`DELETE FROM ${table}`)
            if (data[table].length === 0) continue
            const cols = Object.keys(data[table][0])
            const placeholders = cols.map(() => '?').join(', ')
            const sql = `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`
            for (const row of data[table]) {
              db.run(sql, cols.map((c) => row[c] ?? null))
            }
          }
          db.run('COMMIT')
          setImportMsg({ type: 'ok', text: 'Data imported successfully. Refresh to see changes.' })
        } catch (err) {
          db.run('ROLLBACK')
          throw err
        }
      } catch (err: any) {
        setImportMsg({ type: 'err', text: 'Import failed: ' + (err.message || 'Invalid file') })
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleReset = () => {
    setResetMsg(null)
    if (resetStep === 0) {
      setResetStep(1)
      return
    }
    if (resetConfirm !== 'DELETE ALL DATA') {
      setResetMsg({ type: 'err', text: 'Type "DELETE ALL DATA" to confirm' })
      return
    }
    try {
      const db = getDb()
      db.run('BEGIN TRANSACTION')
      try {
        for (const table of DELETE_ORDER) {
          db.run(`DELETE FROM ${table}`)
        }
        db.run('COMMIT')
        setResetMsg({ type: 'ok', text: 'All data has been deleted. Refresh to start fresh.' })
        setResetStep(0)
        setResetConfirm('')
        setTimeout(() => setShowReset(false), 2000)
      } catch (err) {
        db.run('ROLLBACK')
        throw err
      }
    } catch (err: any) {
      setResetMsg({ type: 'err', text: 'Reset failed: ' + (err.message || 'Unknown error') })
    }
  }

  const cancelReset = () => {
    setShowReset(false)
    setResetStep(0)
    setResetConfirm('')
    setResetMsg(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Store</h2>
        <div>
          <label className="text-gray-700 text-sm block mb-1 font-medium">Store Name</label>
          <input type="text" value={settings.storeName} onChange={(e) => settings.setStoreName(e.target.value)}
            className="input-base" />
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Currency</h2>
        <div className="flex flex-wrap gap-2">
          {CURRENCY_PRESETS.map((p) => (
            <button key={p.symbol} onClick={() => settings.setCurrency(p.symbol)}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors font-medium ${
                settings.currency === p.symbol
                  ? 'bg-coffee-600 border-coffee-600 text-white'
                  : 'bg-white border-gray-300 text-gray-600 hover:border-gray-400'
              }`}>
              {p.label}
            </button>
          ))}
          <input type="text" value={settings.currency} onChange={(e) => settings.setCurrency(e.target.value)} maxLength={5}
            placeholder="Custom"
            className="input-base w-20" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-700 text-sm block mb-1 font-medium">Symbol Position</label>
            <div className="flex gap-2">
              <button onClick={() => settings.setCurrencyPosition('before')}
                className={`flex-1 py-2 rounded-lg text-sm border font-medium transition-colors ${
                  settings.currencyPosition === 'before' ? 'bg-coffee-600 border-coffee-600 text-white' : 'bg-white border-gray-300 text-gray-600'
                }`}>{settings.currency}10.00 (Before)</button>
              <button onClick={() => settings.setCurrencyPosition('after')}
                className={`flex-1 py-2 rounded-lg text-sm border font-medium transition-colors ${
                  settings.currencyPosition === 'after' ? 'bg-coffee-600 border-coffee-600 text-white' : 'bg-white border-gray-300 text-gray-600'
                }`}>10.00{settings.currency} (After)</button>
            </div>
          </div>
          <div>
            <label className="text-gray-700 text-sm block mb-1 font-medium">Decimal Places</label>
            <div className="flex gap-2">
              {[0, 2, 3].map((n) => (
                <button key={n} onClick={() => settings.setDecimalPlaces(n)}
                  className={`flex-1 py-2 rounded-lg text-sm border font-medium transition-colors ${
                    settings.decimalPlaces === n ? 'bg-coffee-600 border-coffee-600 text-white' : 'bg-white border-gray-300 text-gray-600'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-gray-50 rounded-lg px-3 py-2 text-gray-600 text-sm border border-gray-100">
          Preview: <span className="text-gray-900 font-semibold">
            {settings.currencyPosition === 'before'
              ? `${settings.currency}${(12.5).toFixed(settings.decimalPlaces)}`
              : `${(12.5).toFixed(settings.decimalPlaces)}${settings.currency}`}
          </span>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Tax & Receipt</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-700 text-sm block mb-1 font-medium">Tax Rate (%)</label>
            <input type="number" step="0.1" min="0" max="100" value={settings.taxRate}
              onChange={(e) => settings.setTaxRate(parseFloat(e.target.value) || 0)}
              className="input-base" />
          </div>
          <div>
            <label className="text-gray-700 text-sm block mb-1 font-medium">Receipt Auto-Hide (ms)</label>
            <input type="number" step="1000" min="1000" value={settings.receiptAutoHideMs}
              onChange={(e) => settings.setReceiptAutoHideMs(parseInt(e.target.value) || 5000)}
              className="input-base" />
          </div>
        </div>
      </section>

      <section className="card p-5 space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
        <p className="text-gray-500 text-sm">Export a JSON backup of all data, or import a previous backup to restore.</p>

        <div className="flex gap-3">
          <button onClick={handleExport}
            className="btn-primary flex items-center gap-2">
            <Download size={16} /> Export Data
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="btn-primary flex items-center gap-2">
            <Upload size={16} /> Import Data
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>

        {exportMsg && (
          <div className="flex items-center gap-2 text-emerald-600 text-sm"><Check size={14} /> {exportMsg}</div>
        )}
        {importMsg && (
          <div className={`flex items-center gap-2 text-sm ${importMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
            {importMsg.type === 'ok' ? <Check size={14} /> : <X size={14} />} {importMsg.text}
          </div>
        )}

        <div className="border-t border-gray-200 pt-4 mt-4">
          <button onClick={() => setShowReset(!showReset)}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors">
            <Trash2 size={14} /> Reset All Data
          </button>
        </div>

        {showReset && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
            {resetStep === 0 ? (
              <>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-red-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-700 font-medium text-sm">This will permanently delete ALL data</p>
                    <p className="text-red-600 text-xs mt-1">Menu items, products, recipes, transactions, expenses, and user accounts will be erased. This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-amber-600 text-xs">
                  <AlertTriangle size={12} />
                  <span>Make sure you have exported a backup first.</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelReset}
                    className="btn-secondary px-3 py-1.5 text-sm">Cancel</button>
                  <button onClick={handleReset}
                    className="btn-danger px-3 py-1.5 text-sm">I understand, continue</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-red-700 text-sm font-medium">Type <span className="font-mono bg-red-100 px-1 rounded">DELETE ALL DATA</span> to confirm:</p>
                <input type="text" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)}
                  placeholder='Type "DELETE ALL DATA"'
                  className="input-base border-red-300 focus:ring-red-500 focus:border-red-500" />
                <div className="flex gap-2">
                  <button onClick={cancelReset}
                    className="btn-secondary px-3 py-1.5 text-sm">Cancel</button>
                  <button onClick={handleReset} disabled={resetConfirm !== 'DELETE ALL DATA'}
                    className="btn-danger px-3 py-1.5 text-sm disabled:bg-red-200 disabled:text-red-400">
                    Delete Everything
                  </button>
                </div>
              </>
            )}
            {resetMsg && (
              <div className={`flex items-center gap-2 text-sm ${resetMsg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>
                {resetMsg.type === 'ok' ? <Check size={14} /> : <X size={14} />} {resetMsg.text}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
