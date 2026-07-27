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

const TABLES = ['users', 'products', 'menu_items', 'recipes', 'transactions', 'transaction_items', 'inventory_logs', 'expenses', 'sync_queue']
const DELETE_ORDER = ['sync_queue', 'transaction_items', 'inventory_logs', 'expenses', 'recipes', 'transactions', 'menu_items', 'products', 'users']

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
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Store */}
      <section className="bg-coffee-900 border border-coffee-800 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Store</h2>
        <div>
          <label className="text-coffee-400 text-sm block mb-1">Store Name</label>
          <input type="text" value={settings.storeName} onChange={(e) => settings.setStoreName(e.target.value)}
            className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
        </div>
      </section>

      {/* Currency */}
      <section className="bg-coffee-900 border border-coffee-800 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Currency</h2>
        <div className="flex flex-wrap gap-2">
          {CURRENCY_PRESETS.map((p) => (
            <button key={p.symbol} onClick={() => settings.setCurrency(p.symbol)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                settings.currency === p.symbol
                  ? 'bg-coffee-700 border-coffee-500 text-white'
                  : 'bg-coffee-950 border-coffee-800 text-coffee-400 hover:border-coffee-600'
              }`}>
              {p.label}
            </button>
          ))}
          <input type="text" value={settings.currency} onChange={(e) => settings.setCurrency(e.target.value)} maxLength={5}
            placeholder="Custom"
            className="w-20 bg-coffee-950 border border-coffee-800 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-coffee-500" />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-coffee-400 text-sm block mb-1">Symbol Position</label>
            <div className="flex gap-2">
              <button onClick={() => settings.setCurrencyPosition('before')}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  settings.currencyPosition === 'before' ? 'bg-coffee-700 border-coffee-500 text-white' : 'bg-coffee-950 border-coffee-800 text-coffee-400'
                }`}>{settings.currency}10.00 (Before)</button>
              <button onClick={() => settings.setCurrencyPosition('after')}
                className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                  settings.currencyPosition === 'after' ? 'bg-coffee-700 border-coffee-500 text-white' : 'bg-coffee-950 border-coffee-800 text-coffee-400'
                }`}>10.00{settings.currency} (After)</button>
            </div>
          </div>
          <div>
            <label className="text-coffee-400 text-sm block mb-1">Decimal Places</label>
            <div className="flex gap-2">
              {[0, 2, 3].map((n) => (
                <button key={n} onClick={() => settings.setDecimalPlaces(n)}
                  className={`flex-1 py-2 rounded-lg text-sm border transition-colors ${
                    settings.decimalPlaces === n ? 'bg-coffee-700 border-coffee-500 text-white' : 'bg-coffee-950 border-coffee-800 text-coffee-400'
                  }`}>{n}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-coffee-950 rounded-lg px-3 py-2 text-coffee-300 text-sm">
          Preview: <span className="text-white font-semibold">
            {settings.currencyPosition === 'before'
              ? `${settings.currency}${(12.5).toFixed(settings.decimalPlaces)}`
              : `${(12.5).toFixed(settings.decimalPlaces)}${settings.currency}`}
          </span>
        </div>
      </section>

      {/* Tax & Receipt */}
      <section className="bg-coffee-900 border border-coffee-800 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Tax & Receipt</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-coffee-400 text-sm block mb-1">Tax Rate (%)</label>
            <input type="number" step="0.1" min="0" max="100" value={settings.taxRate}
              onChange={(e) => settings.setTaxRate(parseFloat(e.target.value) || 0)}
              className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
          </div>
          <div>
            <label className="text-coffee-400 text-sm block mb-1">Receipt Auto-Hide (ms)</label>
            <input type="number" step="1000" min="1000" value={settings.receiptAutoHideMs}
              onChange={(e) => settings.setReceiptAutoHideMs(parseInt(e.target.value) || 5000)}
              className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500" />
          </div>
        </div>
      </section>

      {/* Data Management */}
      <section className="bg-coffee-900 border border-coffee-800 rounded-xl p-5 space-y-4">
        <h2 className="text-lg font-semibold text-white">Data Management</h2>
        <p className="text-coffee-400 text-sm">Export a JSON backup of all data, or import a previous backup to restore.</p>

        <div className="flex gap-3">
          <button onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-coffee-700 hover:bg-coffee-600 text-white text-sm font-medium transition-colors">
            <Download size={16} /> Export Data
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-coffee-700 hover:bg-coffee-600 text-white text-sm font-medium transition-colors">
            <Upload size={16} /> Import Data
          </button>
          <input ref={fileRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        </div>

        {exportMsg && (
          <div className="flex items-center gap-2 text-emerald-400 text-sm"><Check size={14} /> {exportMsg}</div>
        )}
        {importMsg && (
          <div className={`flex items-center gap-2 text-sm ${importMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
            {importMsg.type === 'ok' ? <Check size={14} /> : <X size={14} />} {importMsg.text}
          </div>
        )}

        <div className="border-t border-coffee-800 pt-4 mt-4">
          <button onClick={() => setShowReset(!showReset)}
            className="flex items-center gap-2 text-red-400 hover:text-red-300 text-sm font-medium transition-colors">
            <Trash2 size={14} /> Reset All Data
          </button>
        </div>

        {showReset && (
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 space-y-3">
            {resetStep === 0 ? (
              <>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="text-red-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-red-300 font-medium text-sm">This will permanently delete ALL data</p>
                    <p className="text-red-400/80 text-xs mt-1">Menu items, products, recipes, transactions, expenses, and user accounts will be erased. This cannot be undone.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-amber-400 text-xs">
                  <AlertTriangle size={12} />
                  <span>Make sure you have exported a backup first.</span>
                </div>
                <div className="flex gap-2">
                  <button onClick={cancelReset}
                    className="px-3 py-1.5 rounded-lg border border-coffee-700 text-coffee-400 hover:bg-coffee-800 text-sm">Cancel</button>
                  <button onClick={handleReset}
                    className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 text-white text-sm font-medium">I understand, continue</button>
                </div>
              </>
            ) : (
              <>
                <p className="text-red-300 text-sm font-medium">Type <span className="font-mono bg-red-900/50 px-1 rounded">DELETE ALL DATA</span> to confirm:</p>
                <input type="text" value={resetConfirm} onChange={e => setResetConfirm(e.target.value)}
                  placeholder='Type "DELETE ALL DATA"'
                  className="w-full bg-coffee-950 border border-red-800 rounded-lg px-3 py-2 text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-red-500" />
                <div className="flex gap-2">
                  <button onClick={cancelReset}
                    className="px-3 py-1.5 rounded-lg border border-coffee-700 text-coffee-400 hover:bg-coffee-800 text-sm">Cancel</button>
                  <button onClick={handleReset} disabled={resetConfirm !== 'DELETE ALL DATA'}
                    className="px-3 py-1.5 rounded-lg bg-red-800 hover:bg-red-700 disabled:bg-red-900/50 disabled:text-red-400/50 text-white text-sm font-medium transition-colors">
                    Delete Everything
                  </button>
                </div>
              </>
            )}
            {resetMsg && (
              <div className={`flex items-center gap-2 text-sm ${resetMsg.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                {resetMsg.type === 'ok' ? <Check size={14} /> : <X size={14} />} {resetMsg.text}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
