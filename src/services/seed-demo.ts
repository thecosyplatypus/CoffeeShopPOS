import { v4 as uuid } from 'uuid'
import { query, run, get, setBulkMode, forceSave } from './db'

const MENU_ITEMS = [
  { id: 'item_espresso', name: 'Espresso', category: 'Coffee', sellPrice: 3.50, weight: 8 },
  { id: 'item_macchiato', name: 'Macchiato', category: 'Coffee', sellPrice: 4.00, weight: 5 },
  { id: 'item_americano', name: 'Americano', category: 'Coffee', sellPrice: 3.75, weight: 12 },
  { id: 'item_flat_white', name: 'Flat White', category: 'Coffee', sellPrice: 4.50, weight: 10 },
  { id: 'item_cappuccino', name: 'Cappuccino', category: 'Coffee', sellPrice: 4.50, weight: 14 },
  { id: 'item_latte', name: 'Latte', category: 'Coffee', sellPrice: 4.75, weight: 18 },
  { id: 'item_mocha', name: 'Mocha', category: 'Coffee', sellPrice: 5.25, weight: 8 },
  { id: 'item_pit_mocha', name: 'Peanut Mocha', category: 'Specialty', sellPrice: 5.50, weight: 4 },
  { id: 'item_mocha_shiver', name: 'Mocha Shiver', category: 'Specialty', sellPrice: 5.75, weight: 5 },
  { id: 'item_drink_dark', name: 'Dark Chocolate', category: 'Hot Chocolate', sellPrice: 4.50, weight: 4 },
  { id: 'item_drink_milk', name: 'Milk Chocolate', category: 'Hot Chocolate', sellPrice: 4.25, weight: 3 },
  { id: 'item_drink_white', name: 'White Chocolate', category: 'Hot Chocolate', sellPrice: 4.50, weight: 3 },
  { id: 'item_cacao_long', name: 'Cacao Long', category: 'Specialty', sellPrice: 5.00, weight: 2 },
  { id: 'item_cacao_cap', name: 'Cacao Cappuccino', category: 'Specialty', sellPrice: 5.25, weight: 2 },
  { id: 'item_cacao_latte', name: 'Cacao Latte', category: 'Specialty', sellPrice: 5.50, weight: 2 },
  { id: 'item_dark_shiver', name: 'Dark Shiver', category: 'Specialty', sellPrice: 5.75, weight: 3 },
  { id: 'item_white_shiver', name: 'White Shiver', category: 'Specialty', sellPrice: 5.50, weight: 2 },
]

const PRODUCTS = [
  { id: 'prod_beans', name: 'Espresso Beans', unit: 'g', costPrice: 0.05, refillKg: 5, costPerKg: 50 },
  { id: 'prod_milk', name: 'Whole Milk', unit: 'ml', costPrice: 0.002, refillL: 10, costPerL: 2 },
  { id: 'prod_oat_milk', name: 'Oat Milk', unit: 'ml', costPrice: 0.004, refillL: 10, costPerL: 4 },
  { id: 'prod_dark_choc', name: 'Dark Chocolate 71%', unit: 'g', costPrice: 0.02, refillKg: 2, costPerKg: 20 },
  { id: 'prod_milk_choc', name: 'Milk Chocolate 40%', unit: 'g', costPrice: 0.018, refillKg: 2, costPerKg: 18 },
  { id: 'prod_white_choc', name: 'White Chocolate 38%', unit: 'g', costPrice: 0.016, refillKg: 2, costPerKg: 16 },
  { id: 'prod_cacao', name: 'Cacao Paste', unit: 'g', costPrice: 0.04, refillKg: 1, costPerKg: 40 },
  { id: 'prod_syrup_van', name: 'Vanilla Syrup', unit: 'ml', costPrice: 0.03, refillL: 5, costPerL: 30 },
  { id: 'prod_syrup_caram', name: 'Caramel Syrup', unit: 'ml', costPrice: 0.03, refillL: 5, costPerL: 30 },
  { id: 'prod_syrup_haz', name: 'Hazelnut Syrup', unit: 'ml', costPrice: 0.03, refillL: 5, costPerL: 30 },
  { id: 'prod_cream', name: 'Whipping Cream', unit: 'ml', costPrice: 0.008, refillL: 5, costPerL: 8 },
  { id: 'prod_ice', name: 'Ice', unit: 'g', costPrice: 0.001, refillKg: 20, costPerKg: 1 },
  { id: 'prod_choc_shav', name: 'Chocolate Shavings', unit: 'g', costPrice: 0.03, refillKg: 1, costPerKg: 30 },
  { id: 'prod_cups', name: 'Paper Cups', unit: 'pcs', costPrice: 0.05, refillQty: 500, costPerUnit: 0.05 },
  { id: 'prod_lids', name: 'Cup Lids', unit: 'pcs', costPrice: 0.02, refillQty: 500, costPerUnit: 0.02 },
]

const RECIPES: { menuItemId: string; productId: string; quantityUsed: number; unit: string; wastePercent: number }[] = [
  { menuItemId: 'item_espresso', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_espresso', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_espresso', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_macchiato', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_macchiato', productId: 'prod_milk', quantityUsed: 30, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_macchiato', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_macchiato', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_americano', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_americano', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_americano', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_flat_white', productId: 'prod_beans', quantityUsed: 20, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_flat_white', productId: 'prod_milk', quantityUsed: 120, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_flat_white', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_flat_white', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cappuccino', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_cappuccino', productId: 'prod_milk', quantityUsed: 150, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_cappuccino', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cappuccino', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_latte', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_latte', productId: 'prod_milk', quantityUsed: 200, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_latte', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_latte', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_mocha', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_mocha', productId: 'prod_milk', quantityUsed: 200, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_mocha', productId: 'prod_dark_choc', quantityUsed: 15, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_mocha', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_mocha', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_pit_mocha', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_pit_mocha', productId: 'prod_milk', quantityUsed: 200, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_pit_mocha', productId: 'prod_dark_choc', quantityUsed: 15, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_pit_mocha', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_pit_mocha', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_mocha_shiver', productId: 'prod_beans', quantityUsed: 18, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_mocha_shiver', productId: 'prod_milk', quantityUsed: 150, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_mocha_shiver', productId: 'prod_dark_choc', quantityUsed: 15, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_mocha_shiver', productId: 'prod_ice', quantityUsed: 100, unit: 'g', wastePercent: 0 },
  { menuItemId: 'item_mocha_shiver', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_mocha_shiver', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_drink_dark', productId: 'prod_milk', quantityUsed: 250, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_drink_dark', productId: 'prod_dark_choc', quantityUsed: 25, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_drink_dark', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_drink_dark', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_drink_milk', productId: 'prod_milk', quantityUsed: 250, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_drink_milk', productId: 'prod_milk_choc', quantityUsed: 25, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_drink_milk', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_drink_milk', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_drink_white', productId: 'prod_milk', quantityUsed: 250, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_drink_white', productId: 'prod_white_choc', quantityUsed: 25, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_drink_white', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_drink_white', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cacao_long', productId: 'prod_cacao', quantityUsed: 20, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_cacao_long', productId: 'prod_milk', quantityUsed: 200, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_cacao_long', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cacao_long', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cacao_cap', productId: 'prod_cacao', quantityUsed: 20, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_cacao_cap', productId: 'prod_milk', quantityUsed: 150, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_cacao_cap', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cacao_cap', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cacao_latte', productId: 'prod_cacao', quantityUsed: 20, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_cacao_latte', productId: 'prod_milk', quantityUsed: 200, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_cacao_latte', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_cacao_latte', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_dark_shiver', productId: 'prod_dark_choc', quantityUsed: 30, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_dark_shiver', productId: 'prod_milk', quantityUsed: 150, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_dark_shiver', productId: 'prod_ice', quantityUsed: 120, unit: 'g', wastePercent: 0 },
  { menuItemId: 'item_dark_shiver', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_dark_shiver', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_white_shiver', productId: 'prod_white_choc', quantityUsed: 25, unit: 'g', wastePercent: 2 },
  { menuItemId: 'item_white_shiver', productId: 'prod_milk', quantityUsed: 150, unit: 'ml', wastePercent: 3 },
  { menuItemId: 'item_white_shiver', productId: 'prod_ice', quantityUsed: 120, unit: 'g', wastePercent: 0 },
  { menuItemId: 'item_white_shiver', productId: 'prod_cups', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
  { menuItemId: 'item_white_shiver', productId: 'prod_lids', quantityUsed: 1, unit: 'pcs', wastePercent: 0 },
]

const EXPENSE_TEMPLATES = [
  { desc: 'Monthly Rent', category: 'Rent', min: 2800, max: 3200, frequency: 'monthly' as const },
  { desc: 'Electricity Bill', category: 'Utilities', min: 350, max: 550, frequency: 'monthly' as const },
  { desc: 'Internet & Phone', category: 'Utilities', min: 80, max: 120, frequency: 'monthly' as const },
  { desc: 'Water Bill', category: 'Utilities', min: 100, max: 180, frequency: 'monthly' as const },
  { desc: 'Weekly Staff Wages', category: 'Staff', min: 1800, max: 2400, frequency: 'weekly' as const },
  { desc: 'Cleaning Supplies', category: 'Cleaning', min: 80, max: 150, frequency: 'monthly' as const },
  { desc: 'Marketing & Social Media', category: 'Marketing', min: 200, max: 500, frequency: 'monthly' as const },
  { desc: 'Equipment Maintenance', category: 'Maintenance', min: 150, max: 400, frequency: 'monthly' as const },
  { desc: 'Insurance', category: 'Insurance', min: 300, max: 450, frequency: 'monthly' as const },
  { desc: 'Licenses & Permits', category: 'Licenses', min: 50, max: 100, frequency: 'monthly' as const },
]

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min
}

function randInt(min: number, max: number): number {
  return Math.floor(rand(min, max + 1))
}

function pickWeighted<T extends { id: string; weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0)
  let r = Math.random() * total
  for (const item of items) {
    r -= item.weight
    if (r <= 0) return item
  }
  return items[items.length - 1]
}

function getDayOfWeek(date: Date): number {
  return date.getDay()
}

function isWeekend(date: Date): boolean {
  const d = getDayOfWeek(date)
  return d === 0 || d === 6
}

function getHourMultiplier(hour: number): number {
  if (hour >= 7 && hour <= 9) return 1.8
  if (hour >= 10 && hour <= 11) return 1.2
  if (hour >= 12 && hour <= 13) return 1.5
  if (hour >= 14 && hour <= 16) return 0.8
  if (hour >= 17 && hour <= 18) return 0.5
  return 0.2
}

function getMonthMultiplier(month: number): number {
  const mults = [0.7, 0.65, 0.8, 0.9, 1.0, 1.1, 1.15, 1.1, 1.0, 0.9, 0.85, 0.75]
  return mults[month]
}

function ensureDemoProductsAndMenu(): void {
  for (const p of PRODUCTS) {
    const exists = get<{ id: string }>('SELECT id FROM products WHERE id = ?', [p.id])
    if (!exists) {
      const refill = 'refillKg' in p ? (p as any).refillKg * 1000 : 'refillL' in p ? (p as any).refillL * 1000 : (p as any).refillQty
      run(
        'INSERT OR IGNORE INTO products (id, name, unit, cost_price, sell_price, stock_level, min_stock_level, bulk_quantity, bulk_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [p.id, p.name, p.unit, p.costPrice, null, refill, refill * 0.2, refill, 'refillKg' in p ? (p as any).costPerKg * (p as any).refillKg : 'refillL' in p ? (p as any).costPerL * (p as any).refillL : (p as any).refillQty * p.costPrice]
      )
    }
  }
  for (const mi of MENU_ITEMS) {
    const exists = get<{ id: string }>('SELECT id FROM menu_items WHERE id = ?', [mi.id])
    if (!exists) {
      run(
        'INSERT OR IGNORE INTO menu_items (id, name, category, sell_price) VALUES (?, ?, ?, ?)',
        [mi.id, mi.name, mi.category, mi.sellPrice]
      )
    }
  }
  for (const r of RECIPES) {
    const exists = get<{ id: string }>('SELECT id FROM recipes WHERE menu_item_id = ? AND product_id = ?', [r.menuItemId, r.productId])
    if (!exists) {
      run(
        'INSERT OR IGNORE INTO recipes (id, menu_item_id, product_id, quantity_used, unit, waste_percent) VALUES (?, ?, ?, ?, ?, ?)',
        [`rec_${uuid().slice(0, 8)}`, r.menuItemId, r.productId, r.quantityUsed, r.unit, r.wastePercent]
      )
    }
  }
}

export async function seedDemoData(userId: string): Promise<{ transactions: number; expenses: number; adjustments: number; totalRevenue: number; totalExpenses: number }> {
  const existing = get<{ count: number }>('SELECT COUNT(*) as count FROM transactions')
  if (existing && existing.count > 0) {
    return { transactions: 0, expenses: 0, adjustments: 0, totalRevenue: 0, totalExpenses: 0 }
  }

  ensureDemoProductsAndMenu()

  let txCount = 0
  let expCount = 0
  let adjCount = 0
  let totalRevenue = 0
  let totalExpenses = 0

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 364)

  const stockLevels: Record<string, number> = {}
  for (const p of PRODUCTS) {
    const existing = get<{ stockLevel: number }>('SELECT stock_level FROM products WHERE id = ?', [p.id])
    stockLevels[p.id] = existing?.stockLevel ?? 20000
  }

  setBulkMode(true)
  run('BEGIN TRANSACTION')

  for (let dayOffset = 0; dayOffset < 365; dayOffset++) {
    const currentDate = new Date(startDate)
    currentDate.setDate(currentDate.getDate() + dayOffset)

    const month = currentDate.getMonth()
    const monthMult = getMonthMultiplier(month)
    const weekendMult = isWeekend(currentDate) ? 1.3 : 1.0

    const baseTxPerDay = rand(65, 95)
    const txPerDay = Math.round(baseTxPerDay * monthMult * weekendMult)

    const hours = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17]
    const txPerHour: number[] = hours.map(h => {
      const mult = getHourMultiplier(h)
      return Math.round((txPerDay / hours.length) * mult * rand(0.8, 1.2))
    })
    const totalAssigned = txPerHour.reduce((s, n) => s + n, 0)
    const diff = txPerDay - totalAssigned
    if (diff > 0) txPerHour[1] += diff
    else if (diff < 0) txPerHour[1] = Math.max(0, txPerHour[1] + diff)

    for (let hIdx = 0; hIdx < hours.length; hIdx++) {
      const hour = hours[hIdx]
      const count = txPerHour[hIdx]

      for (let t = 0; t < count; t++) {
        const minute = randInt(0, 59)
        const second = randInt(0, 59)
        const txTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}`
        const dateStr = currentDate.toISOString().slice(0, 10)
        const createdAt = `${dateStr} ${txTime}`

        const numItems = randInt(1, 3)
        const txId = `tx_${uuid().slice(0, 12)}`
        let subtotal = 0
        const paymentMethods = ['cash', 'card', 'card', 'mobile']
        const paymentMethod = paymentMethods[randInt(0, paymentMethods.length - 1)]

        const items: { id: string; qty: number; price: number }[] = []
        for (let i = 0; i < numItems; i++) {
          const chosen = pickWeighted(MENU_ITEMS)
          const menuItem = get<{ sellPrice: number }>('SELECT sell_price FROM menu_items WHERE id = ?', [chosen.id])
          if (!menuItem) continue
          const qty = randInt(1, 2)
          const price = menuItem.sellPrice * qty
          subtotal += price
          items.push({ id: chosen.id, qty, price: menuItem.sellPrice })
        }

        if (items.length === 0) continue

        const taxRate = 0.1
        const taxAmount = Math.round(subtotal * taxRate * 100) / 100
        const totalAmount = Math.round((subtotal + taxAmount) * 100) / 100

        run(
          `INSERT INTO transactions (id, type, user_id, total_amount, subtotal, tax_amount, discount, payment_method, created_at)
           VALUES (?, 'sale', ?, ?, ?, ?, 0, ?, ?)`,
          [txId, userId, totalAmount, subtotal, taxAmount, paymentMethod, createdAt]
        )

        for (const item of items) {
          const itemId = `ti_${uuid().slice(0, 12)}`
          run(
            `INSERT INTO transaction_items (id, transaction_id, menu_item_id, quantity, unit_price, total_price)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [itemId, txId, item.id, item.qty, item.price, item.price * item.qty]
          )

          const recipes = query<{ productId: string; quantityUsed: number; unit: string; wastePercent: number }>(
            'SELECT product_id as productId, quantity_used as quantityUsed, unit, waste_percent as wastePercent FROM recipes WHERE menu_item_id = ?',
            [item.id]
          )

          for (const recipe of recipes) {
            const product = get<{ unit: string }>('SELECT unit FROM products WHERE id = ?', [recipe.productId])
            if (!product) continue

            const totalUsed = recipe.quantityUsed * item.qty * (1 + recipe.wastePercent / 100)
            const stockBefore = stockLevels[recipe.productId] || 0
            const stockAfter = Math.round((stockBefore - totalUsed) * 1000) / 1000

            if (stockAfter < 0) continue

            stockLevels[recipe.productId] = stockAfter

            run(
              `INSERT INTO inventory_logs (id, product_id, type, quantity_change, stock_before, stock_after, reference_type, reference_id, user_id, created_at)
               VALUES (?, ?, 'sale', ?, ?, ?, 'menu_item', ?, ?, ?)`,
              [uuid(), recipe.productId, -totalUsed, stockBefore, stockAfter, item.id, userId, createdAt]
            )
          }
        }
        txCount++
        totalRevenue += totalAmount
      }
    }

    if (currentDate.getDay() === 1) {
      for (const tmpl of EXPENSE_TEMPLATES) {
        if (tmpl.frequency === 'weekly') {
          const amount = Math.round(rand(tmpl.min, tmpl.max) * 100) / 100
          const dateStr = currentDate.toISOString().slice(0, 10)
          const expId = `exp_${uuid().slice(0, 12)}`
          run(
            `INSERT INTO expenses (id, description, amount, category, date, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [expId, tmpl.desc, amount, tmpl.category, dateStr, userId]
          )
          expCount++
          totalExpenses += amount
        }
      }
    }

    if (currentDate.getDate() === 1) {
      for (const tmpl of EXPENSE_TEMPLATES) {
        if (tmpl.frequency === 'monthly') {
          const amount = Math.round(rand(tmpl.min, tmpl.max) * 100) / 100
          const dateStr = currentDate.toISOString().slice(0, 10)
          const expId = `exp_${uuid().slice(0, 12)}`
          run(
            `INSERT INTO expenses (id, description, amount, category, date, user_id) VALUES (?, ?, ?, ?, ?, ?)`,
            [expId, tmpl.desc, amount, tmpl.category, dateStr, userId]
          )
          expCount++
          totalExpenses += amount
        }
      }
    }

    for (const p of PRODUCTS) {
      const level = stockLevels[p.id] || 0
      let minStock = 5000
      if (p.id === 'prod_cups' || p.id === 'prod_lids') minStock = 100
      else if (p.id === 'prod_ice') minStock = 10000

      if (level < minStock * 1.5) {
        let refillAmount = 0
        if ('refillKg' in p) refillAmount = (p as any).refillKg * 1000
        else if ('refillL' in p) refillAmount = (p as any).refillL * 1000
        else if ('refillQty' in p) refillAmount = (p as any).refillQty

        const stockBefore = stockLevels[p.id] || 0
        const stockAfter = Math.round((stockBefore + refillAmount) * 1000) / 1000

        stockLevels[p.id] = stockAfter

        const dateStr = currentDate.toISOString().slice(0, 10)
        run(
          `INSERT INTO inventory_logs (id, product_id, type, quantity_change, stock_before, stock_after, reference_type, reference_id, user_id, created_at)
           VALUES (?, ?, 'adjustment', ?, ?, ?, 'manual', 'stock-refill', ?, ?)`,
          [uuid(), p.id, refillAmount, stockBefore, stockAfter, userId, `${dateStr} 06:00:00`]
        )
        adjCount++
      }
    }
  }

  for (const p of PRODUCTS) {
    const finalStock = stockLevels[p.id] || 0
    run('UPDATE products SET stock_level = ? WHERE id = ?', [Math.max(0, finalStock), p.id])
  }

  run('COMMIT')
  setBulkMode(false)
  await forceSave()

  console.log(`[Seed] Created ${txCount} transactions, ${expCount} expenses, ${adjCount} stock adjustments`)
  return { transactions: txCount, expenses: expCount, adjustments: adjCount, totalRevenue: Math.round(totalRevenue * 100) / 100, totalExpenses: Math.round(totalExpenses * 100) / 100 }
}
