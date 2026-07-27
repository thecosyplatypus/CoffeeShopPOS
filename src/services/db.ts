import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import { SCHEMA_SQL } from '@/db/schema'

let _db: SqlJsDatabase | null = null
let _saveTimer: ReturnType<typeof setTimeout> | null = null
let _dbDirty = false
let _bulkMode = false

function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {}
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    result[camelKey] = obj[key]
  }
  return result
}

const SQL_PROMISE = (async () => {
  const wasmUrl = './sql-wasm.wasm'

  async function fetchWasmBinary(): Promise<Uint8Array> {
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.getWasmBinary) {
      try {
        const buf = await electronAPI.getWasmBinary()
        if (buf) return new Uint8Array(buf)
      } catch {}
    }
    try {
      const resp = await fetch(wasmUrl)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      return new Uint8Array(await resp.arrayBuffer())
    } catch {
      return new Promise<Uint8Array>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', wasmUrl, true)
        xhr.responseType = 'arraybuffer'
        xhr.onload = () => {
          if (xhr.status === 200 || xhr.status === 0) {
            resolve(new Uint8Array(xhr.response))
          } else {
            reject(new Error(`XHR ${xhr.status}`))
          }
        }
        xhr.onerror = () => reject(new Error('XHR failed'))
        xhr.send()
      })
    }
  }

  try {
    const binary = await fetchWasmBinary()
    return initSqlJs({ wasmBinary: binary.buffer as ArrayBuffer })
  } catch {
    return initSqlJs({ locateFile: (file) => wasmUrl })
  }
})()

function scheduleSave() {
  if (_bulkMode) return
  _dbDirty = true
  if (_saveTimer) return
  _saveTimer = setTimeout(() => {
    _saveTimer = null
    if (!_db || !_dbDirty) return
    _dbDirty = false
    const electronAPI = (window as any).electronAPI
    if (electronAPI?.saveDatabase) {
      const data = _db.export()
      electronAPI.saveDatabase(data.buffer)
    }
  }, 500)
}

async function saveNow(): Promise<void> {
  if (!_db) return
  const electronAPI = (window as any).electronAPI
  if (electronAPI?.saveDatabase) {
    const data = _db.export()
    await electronAPI.saveDatabase(data.buffer)
  }
}

export async function initDatabase(): Promise<void> {
  const SQL = await SQL_PROMISE

  const electronAPI = (window as any).electronAPI
  let savedData: ArrayBuffer | null = null
  if (electronAPI?.loadDatabase) {
    savedData = await electronAPI.loadDatabase()
  }

  if (savedData) {
    _db = new SQL.Database(new Uint8Array(savedData))
    console.log('[DB] Database loaded from disk')
  } else {
    _db = new SQL.Database()
    console.log('[DB] Created new database')
  }

  _db.run('PRAGMA foreign_keys = ON')

  _db.run(SCHEMA_SQL)
  console.log('[DB] Schema applied')
}

export function getDb(): SqlJsDatabase {
  if (!_db) throw new Error('Database not initialized')
  return _db
}

function query<T = any>(sql: string, params?: any[]): T[] {
  if (!_db) return []
  const stmt = _db.prepare(sql)
  if (params) stmt.bind(params)
  const results: T[] = []
  while (stmt.step()) {
    results.push(snakeToCamel(stmt.getAsObject()) as T)
  }
  stmt.free()
  return results
}

function run(sql: string, params?: any[]): any {
  if (!_db) return null
  try {
    _db.run(sql, params)
    scheduleSave()
  } catch (err) {
    console.error('[DB] SQL error:', sql, err)
    throw err
  }
  return {}
}

function get<T = any>(sql: string, params?: any[]): T | null {
  if (!_db) return null
  const stmt = _db.prepare(sql)
  if (params) stmt.bind(params)
  if (stmt.step()) {
    const result = snakeToCamel(stmt.getAsObject()) as T
    stmt.free()
    return result
  }
  stmt.free()
  return null
}

export const dbOps = { query, run, get }

export function setBulkMode(on: boolean): void {
  _bulkMode = on
  if (on && _saveTimer) { clearTimeout(_saveTimer); _saveTimer = null }
  if (!on && _dbDirty) scheduleSave()
}

export async function forceSave(): Promise<void> { await saveNow() }

export async function seedDatabase(): Promise<void> {
  const existing = get<{ count: number }>('SELECT COUNT(*) as count FROM menu_items')
  if (existing && existing.count > 0) return

  run(`INSERT INTO products (id, name, unit, cost_price, sell_price, stock_level, min_stock_level) VALUES
    ('prod_beans', 'Espresso Beans', 'g', 0.05, NULL, 20000, 5000),
    ('prod_milk', 'Whole Milk', 'ml', 0.002, NULL, 50000, 10000),
    ('prod_oat_milk', 'Oat Milk', 'ml', 0.004, NULL, 10000, 2000),
    ('prod_dark_choc', 'Dark Chocolate 71%', 'g', 0.02, NULL, 5000, 1000),
    ('prod_milk_choc', 'Milk Chocolate 40%', 'g', 0.018, NULL, 5000, 1000),
    ('prod_white_choc', 'White Chocolate 38%', 'g', 0.016, NULL, 5000, 1000),
    ('prod_cacao', 'Cacao Paste', 'g', 0.04, NULL, 3000, 500),
    ('prod_syrup_van', 'Vanilla Syrup', 'ml', 0.03, NULL, 5000, 1000),
    ('prod_syrup_caram', 'Caramel Syrup', 'ml', 0.03, NULL, 5000, 1000),
    ('prod_syrup_haz', 'Hazelnut Syrup', 'ml', 0.03, NULL, 5000, 1000),
    ('prod_cream', 'Whipping Cream', 'ml', 0.008, NULL, 10000, 2000),
    ('prod_ice', 'Ice', 'g', 0.001, NULL, 50000, 10000),
    ('prod_choc_shav', 'Chocolate Shavings', 'g', 0.03, NULL, 2000, 500),
    ('prod_cups', 'Paper Cups', 'pcs', 0.05, NULL, 500, 100),
    ('prod_lids', 'Cup Lids', 'pcs', 0.02, NULL, 500, 100)
  `)

  run(`INSERT INTO menu_items (id, name, category, sell_price) VALUES
    ('item_espresso', 'Espresso', 'Coffee', 2.85),
    ('item_macchiato', 'Macchiato', 'Coffee', 3.35),
    ('item_americano', 'Americano', 'Coffee', 3.25),
    ('item_flat_white', 'Flat White', 'Coffee', 3.85),
    ('item_cappuccino', 'Cappuccino', 'Coffee', 3.85),
    ('item_latte', 'Latte', 'Coffee', 3.95),
    ('item_mocha', 'Mocha', 'Mochas', 4.40),
    ('item_pit_mocha', 'Pit Mocha', 'Mochas', 5.45),
    ('item_mocha_shiver', 'Mocha Shiver', 'Mochas', 5.45),
    ('item_drink_dark', 'Dark 71%', 'Drinking Chocolate', 4.25),
    ('item_drink_milk', 'Milk 40%', 'Drinking Chocolate', 4.25),
    ('item_drink_white', 'White 38%', 'Drinking Chocolate', 4.25),
    ('item_cacao_long', 'Cacao Long', 'Ceremonial Cacao', 3.50),
    ('item_cacao_cap', 'Cacao Cappuccino', 'Ceremonial Cacao', 4.20),
    ('item_cacao_latte', 'Cacao Latte', 'Ceremonial Cacao', 4.35),
    ('item_dark_shiver', 'Dark Chocolate Shiver', 'Shivers', 5.45),
    ('item_white_shiver', 'White Chocolate Shiver', 'Shivers', 5.45),
    ('item_extra_shot', 'Extra Espresso Shot', 'Extras', 1.25),
    ('item_van_syrup', 'Vanilla Syrup', 'Extras', 0.60),
    ('item_caram_syrup', 'Caramel Syrup', 'Extras', 0.60),
    ('item_haz_syrup', 'Hazelnut Syrup', 'Extras', 0.60),
    ('item_oat_milk', 'Oat Milk', 'Extras', 0.40),
    ('item_choc_cream', 'Chocolate Whipped Cream', 'Extras', 0.80),
    ('item_choc_shav', 'Chocolate Shavings', 'Extras', 1.00)
  `)

  run(`INSERT INTO recipes (id, menu_item_id, product_id, quantity_used, unit, waste_percent) VALUES
    ('r_espn_beans', 'item_espresso', 'prod_beans', 18, 'g', 5),

    ('r_macc_beans', 'item_macchiato', 'prod_beans', 18, 'g', 5),
    ('r_macc_milk', 'item_macchiato', 'prod_milk', 15, 'ml', 2),

    ('r_amer_beans', 'item_americano', 'prod_beans', 18, 'g', 5),

    ('r_fw_beans', 'item_flat_white', 'prod_beans', 18, 'g', 5),
    ('r_fw_milk', 'item_flat_white', 'prod_milk', 180, 'ml', 2),

    ('r_cap_beans', 'item_cappuccino', 'prod_beans', 18, 'g', 5),
    ('r_cap_milk', 'item_cappuccino', 'prod_milk', 120, 'ml', 2),

    ('r_lat_beans', 'item_latte', 'prod_beans', 18, 'g', 5),
    ('r_lat_milk', 'item_latte', 'prod_milk', 250, 'ml', 2),

    ('r_mocha_beans', 'item_mocha', 'prod_beans', 18, 'g', 5),
    ('r_mocha_milk', 'item_mocha', 'prod_milk', 200, 'ml', 2),
    ('r_mocha_dchoc', 'item_mocha', 'prod_dark_choc', 20, 'g', 0),

    ('r_pitm_beans', 'item_pit_mocha', 'prod_beans', 18, 'g', 5),
    ('r_pitm_milk', 'item_pit_mocha', 'prod_milk', 200, 'ml', 2),
    ('r_pitm_dchoc', 'item_pit_mocha', 'prod_dark_choc', 30, 'g', 0),
    ('r_pitm_shav', 'item_pit_mocha', 'prod_choc_shav', 15, 'g', 0),
    ('r_pitm_cream', 'item_pit_mocha', 'prod_cream', 30, 'ml', 0),

    ('r_mshiv_beans', 'item_mocha_shiver', 'prod_beans', 18, 'g', 5),
    ('r_mshiv_milk', 'item_mocha_shiver', 'prod_milk', 150, 'ml', 2),
    ('r_mshiv_dchoc', 'item_mocha_shiver', 'prod_dark_choc', 25, 'g', 0),
    ('r_mshiv_ice', 'item_mocha_shiver', 'prod_ice', 100, 'g', 0),

    ('r_ddrk_dchoc', 'item_drink_dark', 'prod_dark_choc', 30, 'g', 0),
    ('r_ddrk_milk', 'item_drink_dark', 'prod_milk', 250, 'ml', 2),

    ('r_dmlk_mchoc', 'item_drink_milk', 'prod_milk_choc', 30, 'g', 0),
    ('r_dmlk_milk', 'item_drink_milk', 'prod_milk', 250, 'ml', 2),

    ('r_dwhi_wchoc', 'item_drink_white', 'prod_white_choc', 30, 'g', 0),
    ('r_dwhi_milk', 'item_drink_white', 'prod_milk', 250, 'ml', 2),

    ('r_clng_cacao', 'item_cacao_long', 'prod_cacao', 20, 'g', 0),

    ('r_ccap_cacao', 'item_cacao_cap', 'prod_cacao', 20, 'g', 0),
    ('r_ccap_milk', 'item_cacao_cap', 'prod_milk', 120, 'ml', 2),

    ('r_clat_cacao', 'item_cacao_latte', 'prod_cacao', 20, 'g', 0),
    ('r_clat_milk', 'item_cacao_latte', 'prod_milk', 250, 'ml', 2),

    ('r_dshv_dchoc', 'item_dark_shiver', 'prod_dark_choc', 25, 'g', 0),
    ('r_dshv_milk', 'item_dark_shiver', 'prod_milk', 150, 'ml', 2),
    ('r_dshv_ice', 'item_dark_shiver', 'prod_ice', 150, 'g', 0),

    ('r_wshv_wchoc', 'item_white_shiver', 'prod_white_choc', 25, 'g', 0),
    ('r_wshv_milk', 'item_white_shiver', 'prod_milk', 150, 'ml', 2),
    ('r_wshv_ice', 'item_white_shiver', 'prod_ice', 150, 'g', 0),

    ('r_xshot_beans', 'item_extra_shot', 'prod_beans', 18, 'g', 5),

    ('r_xvan_van', 'item_van_syrup', 'prod_syrup_van', 15, 'ml', 0),
    ('r_xcaram_caram', 'item_caram_syrup', 'prod_syrup_caram', 15, 'ml', 0),
    ('r_xhaz_haz', 'item_haz_syrup', 'prod_syrup_haz', 15, 'ml', 0),

    ('r_xoat_oat', 'item_oat_milk', 'prod_oat_milk', 100, 'ml', 0),

    ('r_xccrm_cream', 'item_choc_cream', 'prod_cream', 30, 'ml', 0),
    ('r_xccrm_dchoc', 'item_choc_cream', 'prod_dark_choc', 5, 'g', 0),

    ('r_xcshav_dchoc', 'item_choc_shav', 'prod_dark_choc', 10, 'g', 0),

    ('r_espn_cup', 'item_espresso', 'prod_cups', 1, 'pcs', 0),
    ('r_espn_lid', 'item_espresso', 'prod_lids', 1, 'pcs', 0),
    ('r_macc_cup', 'item_macchiato', 'prod_cups', 1, 'pcs', 0),
    ('r_macc_lid', 'item_macchiato', 'prod_lids', 1, 'pcs', 0),
    ('r_amer_cup', 'item_americano', 'prod_cups', 1, 'pcs', 0),
    ('r_amer_lid', 'item_americano', 'prod_lids', 1, 'pcs', 0),
    ('r_fw_cup', 'item_flat_white', 'prod_cups', 1, 'pcs', 0),
    ('r_fw_lid', 'item_flat_white', 'prod_lids', 1, 'pcs', 0),
    ('r_cap_cup', 'item_cappuccino', 'prod_cups', 1, 'pcs', 0),
    ('r_cap_lid', 'item_cappuccino', 'prod_lids', 1, 'pcs', 0),
    ('r_lat_cup', 'item_latte', 'prod_cups', 1, 'pcs', 0),
    ('r_lat_lid', 'item_latte', 'prod_lids', 1, 'pcs', 0),
    ('r_mocha_cup', 'item_mocha', 'prod_cups', 1, 'pcs', 0),
    ('r_mocha_lid', 'item_mocha', 'prod_lids', 1, 'pcs', 0),
    ('r_pitm_cup', 'item_pit_mocha', 'prod_cups', 1, 'pcs', 0),
    ('r_pitm_lid', 'item_pit_mocha', 'prod_lids', 1, 'pcs', 0),
    ('r_mshiv_cup', 'item_mocha_shiver', 'prod_cups', 1, 'pcs', 0),
    ('r_mshiv_lid', 'item_mocha_shiver', 'prod_lids', 1, 'pcs', 0),
    ('r_ddrk_cup', 'item_drink_dark', 'prod_cups', 1, 'pcs', 0),
    ('r_ddrk_lid', 'item_drink_dark', 'prod_lids', 1, 'pcs', 0),
    ('r_dmlk_cup', 'item_drink_milk', 'prod_cups', 1, 'pcs', 0),
    ('r_dmlk_lid', 'item_drink_milk', 'prod_lids', 1, 'pcs', 0),
    ('r_dwhi_cup', 'item_drink_white', 'prod_cups', 1, 'pcs', 0),
    ('r_dwhi_lid', 'item_drink_white', 'prod_lids', 1, 'pcs', 0),
    ('r_clng_cup', 'item_cacao_long', 'prod_cups', 1, 'pcs', 0),
    ('r_clng_lid', 'item_cacao_long', 'prod_lids', 1, 'pcs', 0),
    ('r_ccap_cup', 'item_cacao_cap', 'prod_cups', 1, 'pcs', 0),
    ('r_ccap_lid', 'item_cacao_cap', 'prod_lids', 1, 'pcs', 0),
    ('r_clat_cup', 'item_cacao_latte', 'prod_cups', 1, 'pcs', 0),
    ('r_clat_lid', 'item_cacao_latte', 'prod_lids', 1, 'pcs', 0),
    ('r_dshv_cup', 'item_dark_shiver', 'prod_cups', 1, 'pcs', 0),
    ('r_dshv_lid', 'item_dark_shiver', 'prod_lids', 1, 'pcs', 0),
    ('r_wshv_cup', 'item_white_shiver', 'prod_cups', 1, 'pcs', 0),
    ('r_wshv_lid', 'item_white_shiver', 'prod_lids', 1, 'pcs', 0)
  `)

  console.log('[DB] Pithead menu seeded')
}

export { query, run, get }
export async function persistDatabase(): Promise<void> { await saveNow() }
