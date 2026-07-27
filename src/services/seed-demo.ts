import { v4 as uuid } from 'uuid'
import { query, run, get } from './db'

const MENU_ITEMS = [
  { id: 'item_espresso', weight: 8 },
  { id: 'item_macchiato', weight: 5 },
  { id: 'item_americano', weight: 12 },
  { id: 'item_flat_white', weight: 10 },
  { id: 'item_cappuccino', weight: 14 },
  { id: 'item_latte', weight: 18 },
  { id: 'item_mocha', weight: 8 },
  { id: 'item_pit_mocha', weight: 4 },
  { id: 'item_mocha_shiver', weight: 5 },
  { id: 'item_drink_dark', weight: 4 },
  { id: 'item_drink_milk', weight: 3 },
  { id: 'item_drink_white', weight: 3 },
  { id: 'item_cacao_long', weight: 2 },
  { id: 'item_cacao_cap', weight: 2 },
  { id: 'item_cacao_latte', weight: 2 },
  { id: 'item_dark_shiver', weight: 3 },
  { id: 'item_white_shiver', weight: 2 },
]

const PRODUCTS = [
  { id: 'prod_beans', name: 'Espresso Beans', unit: 'g', refillKg: 5, costPerKg: 50 },
  { id: 'prod_milk', name: 'Whole Milk', unit: 'ml', refillL: 10, costPerL: 2 },
  { id: 'prod_oat_milk', name: 'Oat Milk', unit: 'ml', refillL: 10, costPerL: 4 },
  { id: 'prod_dark_choc', name: 'Dark Chocolate 71%', unit: 'g', refillKg: 2, costPerKg: 20 },
  { id: 'prod_milk_choc', name: 'Milk Chocolate 40%', unit: 'g', refillKg: 2, costPerKg: 18 },
  { id: 'prod_white_choc', name: 'White Chocolate 38%', unit: 'g', refillKg: 2, costPerKg: 16 },
  { id: 'prod_cacao', name: 'Cacao Paste', unit: 'g', refillKg: 1, costPerKg: 40 },
  { id: 'prod_syrup_van', name: 'Vanilla Syrup', unit: 'ml', refillL: 5, costPerL: 30 },
  { id: 'prod_syrup_caram', name: 'Caramel Syrup', unit: 'ml', refillL: 5, costPerL: 30 },
  { id: 'prod_syrup_haz', name: 'Hazelnut Syrup', unit: 'ml', refillL: 5, costPerL: 30 },
  { id: 'prod_cream', name: 'Whipping Cream', unit: 'ml', refillL: 5, costPerL: 8 },
  { id: 'prod_ice', name: 'Ice', unit: 'g', refillKg: 20, costPerKg: 1 },
  { id: 'prod_choc_shav', name: 'Chocolate Shavings', unit: 'g', refillKg: 1, costPerKg: 30 },
  { id: 'prod_cups', name: 'Paper Cups', unit: 'pcs', refillQty: 500, costPerUnit: 0.05 },
  { id: 'prod_lids', name: 'Cup Lids', unit: 'pcs', refillQty: 500, costPerUnit: 0.02 },
]

const EXPENSE_TEMPLATES = [
  { desc: 'Monthly Rent', category: 'Rent', min: 2800, max: 3200, frequency: 'monthly' as const },
  { desc: 'Electricity Bill', category: 'Utilities', min: 350, max: 550, frequency: 'monthly' as const },
  { desc: 'Internet & Phone', category: 'Utilities', min: 80, max: 120, frequency: 'monthly' as const },
  { desc: 'Water Bill', category: 'Utilities', min: 100, max: 180, frequency: 'monthly' as const },
  { desc: 'Staff Wages - Week 1', category: 'Staff', min: 2200, max: 2800, frequency: 'weekly' as const },
  { desc: 'Staff Wages - Week 2', category: 'Staff', min: 2200, max: 2800, frequency: 'weekly' as const },
  { desc: 'Staff Wages - Week 3', category: 'Staff', min: 2200, max: 2800, frequency: 'weekly' as const },
  { desc: 'Staff Wages - Week 4', category: 'Staff', min: 2200, max: 2800, frequency: 'weekly' as const },
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

export function seedDemoData(userId: string): { transactions: number; expenses: number; adjustments: number } {
  const existing = get<{ count: number }>('SELECT COUNT(*) as count FROM transactions')
  if (existing && existing.count > 0) {
    return { transactions: 0, expenses: 0, adjustments: 0 }
  }

  let txCount = 0
  let expCount = 0
  let adjCount = 0

  const startDate = new Date()
  startDate.setDate(startDate.getDate() - 364)

  const stockLevels: Record<string, number> = {}
  for (const p of PRODUCTS) {
    const existing = get<{ stockLevel: number }>('SELECT stock_level FROM products WHERE id = ?', [p.id])
    stockLevels[p.id] = existing?.stockLevel ?? 20000
  }

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

  console.log(`[Seed] Created ${txCount} transactions, ${expCount} expenses, ${adjCount} stock adjustments`)
  return { transactions: txCount, expenses: expCount, adjustments: adjCount }
}
