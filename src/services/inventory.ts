import { v4 as uuid } from 'uuid'
import { query, run, get } from './db'
import { convert } from '@/utils/units'
import { format } from 'date-fns'
import type { Product, MenuItem, InventoryLog, Expense, Supplier, SupplierProduct, WasteLog, Discount } from '@/types'

export interface SaleItem {
  menuItemId: string
  quantity: number
}

export interface DeductionResult {
  productId: string
  productName: string
  quantityDeducted: number
  stockBefore: number
  stockAfter: number
  unit: string
  success: boolean
  error?: string
}

export function processSale(saleItems: SaleItem[], userId: string, paymentMethod: string = 'cash', taxRate: number = 0, discountCode?: string): DeductionResult[] {
  const results: DeductionResult[] = []

  const transactionId = uuid()
  let subtotal = 0

    run('BEGIN TRANSACTION')

  try {
    run(
      `INSERT INTO transactions (id, type, user_id, total_amount, subtotal, tax_amount, discount, payment_method)
       VALUES (?, 'sale', ?, 0, 0, 0, 0, ?)`,
      [transactionId, userId, paymentMethod]
    )

    for (const item of saleItems) {
      const menuItem = get<{ id: string; name: string; sellPrice: number }>(
        'SELECT id, name, sell_price FROM menu_items WHERE id = ? AND active = 1',
        [item.menuItemId]
      )

      if (!menuItem) {
        run('ROLLBACK')
        return [{ productId: '', productName: 'Unknown', quantityDeducted: 0, stockBefore: 0, stockAfter: 0, unit: '', success: false, error: `Menu item ${item.menuItemId} not found or inactive` }]
      }

      const recipes = query<{ productId: string; productName: string; quantityUsed: number; unit: string; wastePercent: number }>(
        `SELECT r.*, p.name as productName FROM recipes r
         JOIN products p ON p.id = r.product_id
         WHERE r.menu_item_id = ?`,
        [item.menuItemId]
      )

      for (const recipe of recipes) {
        const product = get<Product>('SELECT * FROM products WHERE id = ?', [recipe.productId])
        if (!product) continue

        const convertedQty = convert(recipe.quantityUsed, recipe.unit as any, product.unit)
        const wasteMultiplier = 1 + (recipe.wastePercent || 0) / 100
        const deductionPerUnit = convertedQty * wasteMultiplier
        const totalDeduction = deductionPerUnit * item.quantity
        const stockBefore = product.stockLevel

        if (stockBefore < totalDeduction) {
          run('ROLLBACK')
          return [{ productId: recipe.productId, productName: product.name, quantityDeducted: 0, stockBefore, stockAfter: stockBefore, unit: product.unit, success: false, error: `Insufficient stock: ${product.name} (have ${stockBefore}${product.unit}, need ${totalDeduction}${product.unit})` }]
        }

        const stockAfter = Math.round((stockBefore - totalDeduction) * 1000) / 1000
        run('UPDATE products SET stock_level = ?, updated_at = datetime(\'now\') WHERE id = ?', [stockAfter, recipe.productId])

        run(
          `INSERT INTO inventory_logs (id, product_id, type, quantity_change, stock_before, stock_after, reference_type, reference_id, user_id)
           VALUES (?, ?, 'sale', ?, ?, ?, 'menu_item', ?, ?)`,
          [uuid(), recipe.productId, -totalDeduction, stockBefore, stockAfter, item.menuItemId, userId]
        )

        results.push({
          productId: recipe.productId,
          productName: recipe.productName,
          quantityDeducted: totalDeduction,
          stockBefore,
          stockAfter,
          unit: product.unit,
          success: true,
        })
      }

      const lineTotal = menuItem.sellPrice * item.quantity
      subtotal += lineTotal

      run(
        `INSERT INTO transaction_items (id, transaction_id, menu_item_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [uuid(), transactionId, item.menuItemId, item.quantity, menuItem.sellPrice, lineTotal]
      )
    }

    let discountAmount = 0
    if (discountCode) {
      const discount = get<Discount>(
        'SELECT * FROM discounts WHERE code = ? AND active = 1',
        [discountCode.toUpperCase()]
      )
      if (discount) {
        if (!discount.expiresAt || new Date(discount.expiresAt) >= new Date()) {
          if (!discount.maxUses || discount.uses < discount.maxUses) {
            if (subtotal >= discount.minOrder) {
              discountAmount = discount.type === 'percent' ? subtotal * (discount.value / 100) : Math.min(discount.value, subtotal)
              discountAmount = Math.round(discountAmount * 100) / 100
              run('UPDATE discounts SET uses = uses + 1 WHERE id = ?', [discount.id])
            }
          }
        }
      }
    }

    const afterDiscount = Math.round((subtotal - discountAmount) * 100) / 100
    const taxAmount = Math.round(afterDiscount * taxRate * 100) / 100
    const totalAmount = Math.round((afterDiscount + taxAmount) * 100) / 100

    run(
      `UPDATE transactions SET total_amount = ?, subtotal = ?, tax_amount = ?, discount = ? WHERE id = ?`,
      [totalAmount, subtotal, taxAmount, discountAmount, transactionId]
    )

    run('COMMIT')
  } catch (err) {
    run('ROLLBACK')
    throw err
  }

  return results
}

export function getLowStockProducts(): Product[] {
  return query<Product>(
    'SELECT * FROM products WHERE stock_level <= min_stock_level AND min_stock_level > 0 ORDER BY (stock_level * 1.0 / min_stock_level) ASC'
  )
}

export function getStockAlerts(): { product: Product; alertLevel: 'low' | 'critical' }[] {
  const products = query<Product>('SELECT * FROM products WHERE min_stock_level > 0')
  return products
    .filter(p => p.stockLevel <= p.minStockLevel)
    .map(p => ({
      product: p,
      alertLevel: p.stockLevel <= p.minStockLevel * 0.25 ? 'critical' as const : 'low' as const,
    }))
}

export function getEODReport(date: string): {
  totalSales: number
  totalTransactions: number
  usage: { productName: string; productId: string; theoreticalUsage: number; unit: string }[]
} {
  const totalSales = get<{ total: number }>(
    `SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions
     WHERE type = 'sale' AND date(created_at) = ?`,
    [date]
  )

  const totalTransactions = get<{ count: number }>(
    `SELECT COUNT(*) as count FROM transactions
     WHERE type = 'sale' AND date(created_at) = ?`,
    [date]
  )

  const usage = query<{ productName: string; productId: string; theoreticalUsage: number; unit: string }>(
    `SELECT p.name as productName, p.id as productId,
            SUM(-il.quantity_change) as theoreticalUsage, p.unit
     FROM inventory_logs il
     JOIN products p ON p.id = il.product_id
     WHERE il.type = 'sale' AND date(il.created_at) = ?
     GROUP BY p.id, p.name, p.unit`,
    [date]
  )

  return {
    totalSales: totalSales?.total || 0,
    totalTransactions: totalTransactions?.count || 0,
    usage,
  }
}

export function getProductStockLevels(): Product[] {
  return query<Product>('SELECT * FROM products ORDER BY name')
}

export function adjustStock(productId: string, adjustment: number, userId: string, reason: string, newBulkQuantity?: number, newBulkPrice?: number): boolean {
  const product = get<Product>('SELECT * FROM products WHERE id = ?', [productId])
  if (!product) return false

  const newLevel = Math.round((product.stockLevel + adjustment) * 1000) / 1000
  if (newLevel < 0) return false

  if (newBulkQuantity !== undefined && newBulkPrice !== undefined && newBulkQuantity > 0 && !isNaN(newBulkQuantity) && !isNaN(newBulkPrice) && newBulkPrice >= 0) {
    const newCost = Math.round((newBulkPrice / newBulkQuantity) * 10000) / 10000
    run('UPDATE products SET stock_level = ?, cost_price = ?, bulk_quantity = ?, bulk_price = ?, updated_at = datetime(\'now\') WHERE id = ?', [newLevel, newCost, newBulkQuantity, newBulkPrice, productId])
  } else {
    run('UPDATE products SET stock_level = ?, updated_at = datetime(\'now\') WHERE id = ?', [newLevel, productId])
  }

  run(
    `INSERT INTO inventory_logs (id, product_id, type, quantity_change, stock_before, stock_after, reference_type, reference_id, user_id)
     VALUES (?, ?, 'adjustment', ?, ?, ?, 'manual', ?, ?)`,
    [uuid(), productId, adjustment, product.stockLevel, newLevel, reason, userId]
  )

  return true
}

export function addProduct(name: string, unit: string, costPrice: number, sellPrice: number | null, stockLevel: number, minStockLevel: number, bulkQuantity?: number, bulkPrice?: number): Product | null {
  const id = `prod_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO products (id, name, unit, cost_price, sell_price, stock_level, min_stock_level, bulk_quantity, bulk_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [id, name, unit, costPrice, sellPrice, stockLevel, minStockLevel, bulkQuantity || null, bulkPrice || null]
  )
  return get<Product>('SELECT * FROM products WHERE id = ?', [id])
}

export function removeProduct(productId: string): boolean {
  const ref = get<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM recipes WHERE product_id = ? UNION ALL SELECT COUNT(*) as cnt FROM transaction_items ti JOIN menu_items mi ON mi.id = ti.menu_item_id JOIN recipes r ON r.menu_item_id = mi.id WHERE r.product_id = ?",
    [productId, productId]
  )
  const inUse = get<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM recipes WHERE product_id = ?',
    [productId]
  )
  if (inUse && inUse.cnt > 0) return false
  run('DELETE FROM products WHERE id = ?', [productId])
  return true
}

export function isProductInUse(productId: string): boolean {
  const row = get<{ cnt: number }>('SELECT COUNT(*) as cnt FROM recipes WHERE product_id = ?', [productId])
  return (row?.cnt ?? 0) > 0
}

export function addMenuItem(name: string, category: string, sellPrice: number): MenuItem | null {
  const id = `item_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO menu_items (id, name, category, sell_price) VALUES (?, ?, ?, ?)',
    [id, name, category, sellPrice]
  )
  return get<MenuItem>('SELECT * FROM menu_items WHERE id = ?', [id])
}

export function removeMenuItem(menuItemId: string): boolean {
  run('UPDATE menu_items SET active = 0 WHERE id = ?', [menuItemId])
  return true
}

export function reactivateMenuItem(menuItemId: string): boolean {
  run('UPDATE menu_items SET active = 1 WHERE id = ?', [menuItemId])
  return true
}

export interface RecipeRow {
  id: string
  menuItemId: string
  productId: string
  productName: string
  productUnit: string
  quantityUsed: number
  unit: string
  wastePercent: number
}

export function getRecipesForMenuItem(menuItemId: string): RecipeRow[] {
  return query<RecipeRow>(
    `SELECT r.id, r.menu_item_id as menuItemId, r.product_id as productId,
            p.name as productName, p.unit as productUnit,
            r.quantity_used as quantityUsed, r.unit, r.waste_percent as wastePercent
     FROM recipes r
     JOIN products p ON p.id = r.product_id
     WHERE r.menu_item_id = ?
     ORDER BY p.name`,
    [menuItemId]
  )
}

export function getAllRecipes(): { menuItemId: string; menuItemName: string; category: string; sellPrice: number; ingredients: number }[] {
  return query(
    `SELECT mi.id as menuItemId, mi.name as menuItemName, mi.category, mi.sell_price as sellPrice,
            COUNT(r.id) as ingredients
     FROM menu_items mi
     LEFT JOIN recipes r ON r.menu_item_id = mi.id
     WHERE mi.active = 1
     GROUP BY mi.id
     ORDER BY mi.category, mi.name`
  )
}

export function addRecipe(menuItemId: string, productId: string, quantityUsed: number, unit: string, wastePercent: number): boolean {
  const existing = get<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM recipes WHERE menu_item_id = ? AND product_id = ?',
    [menuItemId, productId]
  )
  if (existing && existing.cnt > 0) return false

  const id = `rec_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO recipes (id, menu_item_id, product_id, quantity_used, unit, waste_percent) VALUES (?, ?, ?, ?, ?, ?)',
    [id, menuItemId, productId, quantityUsed, unit, wastePercent]
  )
  return true
}

export function updateRecipe(recipeId: string, quantityUsed: number, unit: string, wastePercent: number): boolean {
  run(
    'UPDATE recipes SET quantity_used = ?, unit = ?, waste_percent = ? WHERE id = ?',
    [quantityUsed, unit, wastePercent, recipeId]
  )
  return true
}

export function deleteRecipe(recipeId: string): boolean {
  run('DELETE FROM recipes WHERE id = ?', [recipeId])
  return true
}

export function addExpense(description: string, amount: number, category: string, date: string, userId: string): Expense | null {
  const id = `exp_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO expenses (id, description, amount, category, date, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    [id, description, amount, category, date, userId]
  )
  return get<Expense>('SELECT * FROM expenses WHERE id = ?', [id])
}

export function getExpenses(startDate?: string, endDate?: string): Expense[] {
  let sql = 'SELECT * FROM expenses WHERE 1=1'
  const params: any[] = []
  if (startDate) { sql += ' AND date >= ?'; params.push(startDate) }
  if (endDate) { sql += ' AND date <= ?'; params.push(endDate) }
  sql += ' ORDER BY date DESC, created_at DESC'
  return query<Expense>(sql, params)
}

export function deleteExpense(expenseId: string): boolean {
  run('DELETE FROM expenses WHERE id = ?', [expenseId])
  return true
}

export function getExpensesByCategory(startDate?: string, endDate?: string): { category: string; total: number }[] {
  let sql = 'SELECT category, SUM(amount) as total FROM expenses WHERE 1=1'
  const params: any[] = []
  if (startDate) { sql += ' AND date >= ?'; params.push(startDate) }
  if (endDate) { sql += ' AND date <= ?'; params.push(endDate) }
  sql += ' GROUP BY category ORDER BY total DESC'
  return query<{ category: string; total: number }>(sql, params)
}

export function getCOGSByDay(startDate: string, endDate: string): { date: string; cogs: number }[] {
  const rows = query<{ date: string; quantity: number; recipeUnit: string; productUnit: string; costPrice: number; wastePercent: number }>(
    `SELECT date(t.created_at) as date,
            ti.quantity as quantity,
            r.unit as recipeUnit,
            p.unit as productUnit,
            p.cost_price as costPrice,
            r.waste_percent as wastePercent
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     JOIN recipes r ON r.menu_item_id = ti.menu_item_id
     JOIN products p ON p.id = r.product_id
     WHERE t.type = 'sale' AND date(t.created_at) >= ? AND date(t.created_at) <= ?`,
    [startDate, endDate]
  )

  const byDay = new Map<string, number>()
  for (const row of rows) {
    const convertedQty = convert(row.quantity * row.quantity, row.recipeUnit as any, row.productUnit as any)
    const cost = convertedQty * row.costPrice * (1 + row.wastePercent / 100)
    byDay.set(row.date, (byDay.get(row.date) || 0) + cost)
  }

  const result: { date: string; cogs: number }[] = []
  const start = new Date(startDate)
  const end = new Date(endDate)
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    result.push({ date: key, cogs: Math.round((byDay.get(key) || 0) * 100) / 100 })
  }
  return result
}

export function getTotalCOGS(startDate: string, endDate: string): number {
  const rows = query<{ total: number }>(
    `SELECT COALESCE(SUM(
      CASE
        WHEN r.unit = p.unit THEN ti.quantity * r.quantity_used * p.cost_price * (1 + r.waste_percent/100)
        WHEN r.unit IN ('g','kg') AND p.unit IN ('g','kg') THEN
          CASE WHEN r.unit = 'kg' THEN r.quantity_used * 1000 ELSE r.quantity_used END
          * ti.quantity
          * p.cost_price / CASE WHEN p.unit = 'kg' THEN 1000 ELSE 1 END
          * (1 + r.waste_percent/100)
        WHEN r.unit IN ('ml','l') AND p.unit IN ('ml','l') THEN
          CASE WHEN r.unit = 'l' THEN r.quantity_used * 1000 ELSE r.quantity_used END
          * ti.quantity
          * p.cost_price / CASE WHEN p.unit = 'l' THEN 1000 ELSE 1 END
          * (1 + r.waste_percent/100)
        ELSE ti.quantity * r.quantity_used * p.cost_price * (1 + r.waste_percent/100)
      END
    ), 0) as total
     FROM transaction_items ti
     JOIN transactions t ON t.id = ti.transaction_id
     JOIN recipes r ON r.menu_item_id = ti.menu_item_id
     JOIN products p ON p.id = r.product_id
     WHERE t.type = 'sale' AND date(t.created_at) >= ? AND date(t.created_at) <= ?`,
    [startDate, endDate]
  )
  return Math.round((rows[0]?.total || 0) * 100) / 100
}

export function addSupplier(name: string, contactName?: string, phone?: string, email?: string, address?: string, notes?: string): Supplier | null {
  const id = `sup_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO suppliers (id, name, contact_name, phone, email, address, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, name, contactName || null, phone || null, email || null, address || null, notes || null]
  )
  return get<Supplier>('SELECT * FROM suppliers WHERE id = ?', [id])
}

export function getSuppliers(): Supplier[] {
  return query<Supplier>('SELECT * FROM suppliers WHERE active = 1 ORDER BY name')
}

export function getAllSuppliers(): Supplier[] {
  return query<Supplier>('SELECT * FROM suppliers ORDER BY name')
}

export function deleteSupplier(supplierId: string): boolean {
  run('UPDATE suppliers SET active = 0 WHERE id = ?', [supplierId])
  return true
}

export function addSupplierProduct(supplierId: string, productId: string, supplierSku?: string, unitCost?: number, leadTimeDays?: number): boolean {
  const existing = get<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM supplier_products WHERE supplier_id = ? AND product_id = ?',
    [supplierId, productId]
  )
  if (existing && existing.cnt > 0) {
    run(
      'UPDATE supplier_products SET supplier_sku = ?, unit_cost = ?, lead_time_days = ? WHERE supplier_id = ? AND product_id = ?',
      [supplierSku || null, unitCost || null, leadTimeDays || 7, supplierId, productId]
    )
    return true
  }
  const id = `sp_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO supplier_products (id, supplier_id, product_id, supplier_sku, unit_cost, lead_time_days) VALUES (?, ?, ?, ?, ?, ?)',
    [id, supplierId, productId, supplierSku || null, unitCost || null, leadTimeDays || 7]
  )
  return true
}

export function getSupplierProducts(supplierId: string): (SupplierProduct & { productName: string })[] {
  return query(
    `SELECT sp.*, p.name as productName FROM supplier_products sp
     JOIN products p ON p.id = sp.product_id
     WHERE sp.supplier_id = ? ORDER BY p.name`,
    [supplierId]
  )
}

export function logWaste(productId: string, quantity: number, reason: string, userId: string): WasteLog | null {
  const product = get<Product>('SELECT * FROM products WHERE id = ?', [productId])
  if (!product) return null

  const stockAfter = Math.max(0, Math.round((product.stockLevel - quantity) * 1000) / 1000)
  run('UPDATE products SET stock_level = ?, updated_at = datetime(\'now\') WHERE id = ?', [stockAfter, productId])

  const id = `wst_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO waste_logs (id, product_id, quantity, reason, user_id) VALUES (?, ?, ?, ?, ?)',
    [id, productId, quantity, reason, userId]
  )

  run(
    `INSERT INTO inventory_logs (id, product_id, type, quantity_change, stock_before, stock_after, reference_type, reference_id, user_id)
     VALUES (?, ?, 'waste', ?, ?, ?, 'waste_log', ?, ?)`,
    [uuid(), productId, -quantity, product.stockLevel, stockAfter, id, userId]
  )

  return get<WasteLog>('SELECT * FROM waste_logs WHERE id = ?', [id])
}

export function getWasteLogs(startDate?: string, endDate?: string): (WasteLog & { productName: string })[] {
  let sql = `SELECT wl.*, p.name as productName FROM waste_logs wl
     JOIN products p ON p.id = wl.product_id WHERE 1=1`
  const params: any[] = []
  if (startDate) { sql += ' AND date(wl.created_at) >= ?'; params.push(startDate) }
  if (endDate) { sql += ' AND date(wl.created_at) <= ?'; params.push(endDate) }
  sql += ' ORDER BY wl.created_at DESC'
  return query(sql, params)
}

export function addDiscount(code: string, type: 'percent' | 'fixed', value: number, minOrder: number = 0, maxUses?: number, expiresAt?: string): Discount | null {
  const id = `dsc_${uuid().slice(0, 8)}`
  run(
    'INSERT INTO discounts (id, code, type, value, min_order, max_uses, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [id, code.toUpperCase(), type, value, minOrder, maxUses || null, expiresAt || null]
  )
  return get<Discount>('SELECT * FROM discounts WHERE id = ?', [id])
}

export function getDiscounts(): Discount[] {
  return query<Discount>('SELECT * FROM discounts ORDER BY created_at DESC')
}

export function validateDiscount(code: string, subtotal: number): Discount | null {
  const discount = get<Discount>(
    'SELECT * FROM discounts WHERE code = ? AND active = 1',
    [code.toUpperCase()]
  )
  if (!discount) return null
  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) return null
  if (discount.maxUses && discount.uses >= discount.maxUses) return null
  if (subtotal < discount.minOrder) return null
  return discount
}

export function deleteDiscount(discountId: string): boolean {
  run('DELETE FROM discounts WHERE id = ?', [discountId])
  return true
}

export function getBestSellers(days: number = 7): { menuItemId: string; name: string; category: string; totalSold: number; totalRevenue: number }[] {
  return query(
    `SELECT ti.menu_item_id as menuItemId, mi.name, mi.category,
            SUM(ti.quantity) as totalSold, SUM(ti.total_price) as totalRevenue
     FROM transaction_items ti
     JOIN menu_items mi ON mi.id = ti.menu_item_id
     JOIN transactions t ON t.id = ti.transaction_id
     WHERE t.type = 'sale' AND t.created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY ti.menu_item_id
     ORDER BY totalSold DESC`,
    [days]
  )
}

export function getPeakHours(days: number = 7): { hour: number; count: number; revenue: number }[] {
  return query(
    `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour,
            COUNT(*) as count, SUM(total_amount) as revenue
     FROM transactions
     WHERE type = 'sale' AND created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY hour ORDER BY hour`,
    [days]
  )
}

export function getSalesTrend(days: number = 30): { date: string; sales: number; transactions: number }[] {
  return query(
    `SELECT date(created_at) as date, SUM(total_amount) as sales, COUNT(*) as transactions
     FROM transactions
     WHERE type = 'sale' AND created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY date(created_at) ORDER BY date(created_at)`,
    [days]
  )
}

export function getSalesByEmployee(days: number = 7): { userId: string; name: string; totalSales: number; transactionCount: number }[] {
  return query(
    `SELECT t.user_id as userId, u.name,
            SUM(t.total_amount) as totalSales, COUNT(*) as transactionCount
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.type = 'sale' AND t.created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY t.user_id
     ORDER BY totalSales DESC`,
    [days]
  )
}

export function getMenuEngineering(): { menuItemId: string; name: string; category: string; quantitySold: number; totalRevenue: number; avgMargin: number }[] {
  return query(
    `SELECT mi.id as menuItemId, mi.name, mi.category,
            COALESCE(SUM(ti.quantity), 0) as quantitySold,
            COALESCE(SUM(ti.total_price), 0) as totalRevenue,
            CASE WHEN SUM(ti.total_price) > 0
              THEN ((mi.sell_price - (
                SELECT COALESCE(SUM(
                  CASE
                    WHEN r.unit = p.unit THEN r.quantity_used * p.cost_price * (1 + r.waste_percent/100)
                    WHEN r.unit IN ('g','kg') AND p.unit IN ('g','kg') THEN
                      CASE WHEN r.unit = 'kg' THEN r.quantity_used * 1000 ELSE r.quantity_used END
                      * p.cost_price / CASE WHEN p.unit = 'kg' THEN 1000 ELSE 1 END * (1 + r.waste_percent/100)
                    WHEN r.unit IN ('ml','l') AND p.unit IN ('ml','l') THEN
                      CASE WHEN r.unit = 'l' THEN r.quantity_used * 1000 ELSE r.quantity_used END
                      * p.cost_price / CASE WHEN p.unit = 'l' THEN 1000 ELSE 1 END * (1 + r.waste_percent/100)
                    ELSE r.quantity_used * p.cost_price * (1 + r.waste_percent/100)
                  END
                ), 0)
                FROM recipes r JOIN products p ON p.id = r.product_id
                WHERE r.menu_item_id = mi.id
              )) / mi.sell_price) * 100
              ELSE 0
            END as avgMargin
     FROM menu_items mi
     LEFT JOIN transaction_items ti ON ti.menu_item_id = mi.id
     LEFT JOIN transactions t ON t.id = ti.transaction_id AND t.type = 'sale'
     WHERE mi.active = 1
     GROUP BY mi.id
     ORDER BY totalRevenue DESC`
  )
}

export function getReorderSuggestions(): { productId: string; name: string; currentStock: number; minStock: number; unit: string; suggestedOrder: number; supplierName: string | null }[] {
  return query(
    `SELECT p.id as productId, p.name, p.stock_level as currentStock,
            p.min_stock_level as minStock, p.unit,
            CASE WHEN sp.lead_time_days > 0
              THEN ROUND(p.min_stock_level * 1.5 - p.stock_level, 1)
              ELSE ROUND(p.min_stock_level - p.stock_level, 1)
            END as suggestedOrder,
            s.name as supplierName
     FROM products p
     LEFT JOIN supplier_products sp ON sp.product_id = p.id
     LEFT JOIN suppliers s ON s.id = sp.supplier_id
     WHERE p.stock_level <= p.min_stock_level AND p.min_stock_level > 0
     ORDER BY (p.stock_level * 1.0 / p.min_stock_level) ASC`
  )
}

export function getMonthlySales(months: number = 12): { month: string; label: string; sales: number; transactions: number }[] {
  const result: { month: string; label: string; sales: number; transactions: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const mon = d.getMonth()
    const monthStr = `${year}-${String(mon + 1).padStart(2, '0')}`
    const start = `${year}-${String(mon + 1).padStart(2, '0')}-01`
    const end = new Date(year, mon + 1, 0)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    const row = get<{ sales: number; txns: number }>(
      `SELECT COALESCE(SUM(total_amount), 0) as sales, COUNT(*) as txns
       FROM transactions WHERE type = 'sale'
       AND date(created_at) >= ? AND date(created_at) <= ?`,
      [start, endStr]
    )
    result.push({
      month: monthStr,
      label: format(d, 'MMM yyyy'),
      sales: row?.sales || 0,
      transactions: row?.txns || 0,
    })
  }
  return result
}

export function getMonthlyExpenses(months: number = 12): { month: string; expenses: number }[] {
  const result: { month: string; expenses: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const mon = d.getMonth()
    const monthStr = `${year}-${String(mon + 1).padStart(2, '0')}`
    const start = `${year}-${String(mon + 1).padStart(2, '0')}-01`
    const end = new Date(year, mon + 1, 0)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    const row = get<{ total: number }>(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE date >= ? AND date <= ?`,
      [start, endStr]
    )
    result.push({ month: monthStr, expenses: row?.total || 0 })
  }
  return result
}

export function getMonthlyCOGS(months: number = 12): { month: string; cogs: number }[] {
  const result: { month: string; cogs: number }[] = []
  const now = new Date()
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const year = d.getFullYear()
    const mon = d.getMonth()
    const monthStr = `${year}-${String(mon + 1).padStart(2, '0')}`
    const start = `${year}-${String(mon + 1).padStart(2, '0')}-01`
    const end = new Date(year, mon + 1, 0)
    const endStr = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-${String(end.getDate()).padStart(2, '0')}`
    const row = get<{ total: number }>(
      `SELECT COALESCE(SUM(
        CASE
          WHEN r.unit = p.unit THEN ti.quantity * r.quantity_used * p.cost_price * (1 + r.waste_percent/100)
          WHEN r.unit IN ('g','kg') AND p.unit IN ('g','kg') THEN
            CASE WHEN r.unit = 'kg' THEN r.quantity_used * 1000 ELSE r.quantity_used END
            * ti.quantity
            * p.cost_price / CASE WHEN p.unit = 'kg' THEN 1000 ELSE 1 END
            * (1 + r.waste_percent/100)
          WHEN r.unit IN ('ml','l') AND p.unit IN ('ml','l') THEN
            CASE WHEN r.unit = 'l' THEN r.quantity_used * 1000 ELSE r.quantity_used END
            * ti.quantity
            * p.cost_price / CASE WHEN p.unit = 'l' THEN 1000 ELSE 1 END
            * (1 + r.waste_percent/100)
          ELSE ti.quantity * r.quantity_used * p.cost_price * (1 + r.waste_percent/100)
        END
      ), 0) as total
       FROM transaction_items ti
       JOIN transactions t ON t.id = ti.transaction_id
       JOIN recipes r ON r.menu_item_id = ti.menu_item_id
       JOIN products p ON p.id = r.product_id
       WHERE t.type = 'sale' AND date(t.created_at) >= ? AND date(t.created_at) <= ?`,
      [start, endStr]
    )
    result.push({ month: monthStr, cogs: row?.total || 0 })
  }
  return result
}

export function getSalesByPaymentMethod(days: number = 7): { method: string; count: number; total: number }[] {
  return query(
    `SELECT payment_method as method, COUNT(*) as count, SUM(total_amount) as total
     FROM transactions
     WHERE type = 'sale' AND created_at >= datetime('now', '-' || ? || ' days')
     GROUP BY payment_method ORDER BY total DESC`,
    [days]
  )
}

export function exportTransactionsCSV(startDate: string, endDate: string): string {
  const rows = query(
    `SELECT t.id, t.type, u.name as cashier, t.total_amount, t.subtotal,
            t.tax_amount, t.discount, t.payment_method, t.created_at
     FROM transactions t
     JOIN users u ON u.id = t.user_id
     WHERE t.type = 'sale' AND date(t.created_at) >= ? AND date(t.created_at) <= ?
     ORDER BY t.created_at DESC`,
    [startDate, endDate]
  )
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const csvLines = [headers.join(',')]
  for (const row of rows) {
    csvLines.push(headers.map(h => {
      const val = (row as any)[h]
      return typeof val === 'string' && val.includes(',') ? `"${val}"` : val
    }).join(','))
  }
  return csvLines.join('\n')
}
