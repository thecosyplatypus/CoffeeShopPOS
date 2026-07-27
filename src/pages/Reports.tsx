import { useEffect, useState } from 'react'
import { query, get } from '@/services/db'
import { addExpense, getExpenses, deleteExpense, getExpensesByCategory, getMenuEngineering, exportTransactionsCSV, getSalesTrend, getCOGSByDay, getTotalCOGS, getMonthlySales, getMonthlyExpenses, getMonthlyCOGS } from '@/services/inventory'
import { getCurrentUser } from '@/services/auth'
import { formatCurrency } from '@/utils/format'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import { format, subDays } from 'date-fns'
import { Plus, Trash2, Receipt, Download, BarChart3, Calendar } from 'lucide-react'
import type { Expense } from '@/types'

const COLORS = ['#b56722', '#d4852e', '#e09d4a', '#97501f', '#e9bd7c', '#7c4121']

const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Supplies', 'Equipment', 'Maintenance',
  'Staff', 'Marketing', 'Insurance', 'Licenses', 'Cleaning', 'Other'
]

export function ReportsPage() {
  const [salesData, setSalesData] = useState<any[]>([])
  const [categoryData, setCategoryData] = useState<any[]>([])
  const [period, setPeriod] = useState<'7' | '30'>('7')
  const [tab, setTab] = useState<'sales' | 'expenses' | 'menu' | 'trends' | 'monthly'>('sales')

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expensesByCategory, setExpensesByCategory] = useState<{ category: string; total: number }[]>([])
  const [showAddExpense, setShowAddExpense] = useState(false)
  const [expDesc, setExpDesc] = useState('')
  const [expAmount, setExpAmount] = useState('')
  const [expCategory, setExpCategory] = useState('Supplies')
  const [expDate, setExpDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const [menuEngineering, setMenuEngineering] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [cogsByDay, setCogsByDay] = useState<{ date: string; cogs: number }[]>([])
  const [totalCOGS, setTotalCOGS] = useState(0)

  const [monthlySales, setMonthlySales] = useState<{ month: string; label: string; sales: number; transactions: number }[]>([])
  const [monthlyExpenses, setMonthlyExpenses] = useState<{ month: string; expenses: number }[]>([])
  const [monthlyCOGS, setMonthlyCOGS] = useState<{ month: string; cogs: number }[]>([])

  const days = parseInt(period)
  const startDate = format(subDays(new Date(), days), 'yyyy-MM-dd')
  const endDate = format(new Date(), 'yyyy-MM-dd')

  const loadSales = () => {
    const data = Array.from({ length: days }, (_, i) => {
      const date = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd')
      const result = get<{ total: number }>(
        `SELECT COALESCE(SUM(total_amount), 0) as total FROM transactions WHERE type = 'sale' AND date(created_at) = ?`,
        [date]
      )
      return { date: format(new Date(date), 'MMM dd'), sales: result?.total || 0 }
    })
    setSalesData(data)

    const categories = query<{ category: string; total: number }>(
      `SELECT mi.category, SUM(ti.total_price) as total
       FROM transaction_items ti JOIN menu_items mi ON mi.id = ti.menu_item_id
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE t.type = 'sale' GROUP BY mi.category ORDER BY total DESC`
    )
    setCategoryData(categories)

    setMenuEngineering(getMenuEngineering())
    setTrendData(getSalesTrend(30).map(t => ({ date: format(new Date(t.date), 'MMM dd'), sales: t.sales, transactions: t.transactions })))
    setCogsByDay(getCOGSByDay(startDate, endDate))
    setTotalCOGS(getTotalCOGS(startDate, endDate))

    setMonthlySales(getMonthlySales(12))
    setMonthlyExpenses(getMonthlyExpenses(12))
    setMonthlyCOGS(getMonthlyCOGS(12))
  }

  const loadExpenses = () => {
    setExpenses(getExpenses(startDate, endDate))
    setExpensesByCategory(getExpensesByCategory(startDate, endDate))
  }

  useEffect(() => {
    loadSales()
    loadExpenses()
  }, [period])

  const totalSales = salesData.reduce((s, d) => s + d.sales, 0)
  const avgDaily = totalSales / salesData.filter(d => d.sales > 0).length || 0
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const totalAllExpenses = totalExpenses + totalCOGS
  const netProfit = totalSales - totalAllExpenses
  const profitMargin = totalSales > 0 ? (netProfit / totalSales) * 100 : null

  const handleAddExpense = () => {
    if (!expDesc.trim() || !expAmount) return
    const amount = parseFloat(expAmount)
    if (isNaN(amount) || amount <= 0) return
    const user = getCurrentUser()
    if (!user) return
    addExpense(expDesc.trim(), amount, expCategory, expDate, user.id)
    setExpDesc('')
    setExpAmount('')
    setShowAddExpense(false)
    loadExpenses()
  }

  const handleDeleteExpense = (id: string) => {
    deleteExpense(id)
    loadExpenses()
  }

  const handleExportCSV = () => {
    const csv = exportTransactionsCSV(startDate, endDate)
    if (!csv) return
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `transactions_${startDate}_to_${endDate}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const getClassification = (qty: number, margin: number) => {
    if (qty > 0 && margin >= 60) return { label: 'Star', color: 'text-emerald-700 bg-emerald-50 ring-emerald-200' }
    if (qty > 0 && margin < 60) return { label: 'Workhorse', color: 'text-blue-700 bg-blue-50 ring-blue-200' }
    if (qty === 0 && margin >= 60) return { label: 'Puzzle', color: 'text-amber-700 bg-amber-50 ring-amber-200' }
    return { label: 'Dog', color: 'text-red-700 bg-red-50 ring-red-200' }
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex flex-wrap gap-2 items-center">
          <button onClick={() => setPeriod('7')}
            className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${period === '7' ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>7 Days</button>
          <button onClick={() => setPeriod('30')}
            className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${period === '30' ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>30 Days</button>
          <button onClick={handleExportCSV}
            className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm">
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto flex-nowrap">
        {([
          { key: 'sales' as const, label: 'Sales' },
          { key: 'monthly' as const, label: 'Monthly' },
          { key: 'expenses' as const, label: 'Expenses' },
          { key: 'menu' as const, label: 'Menu Engineering' },
          { key: 'trends' as const, label: 'Trends' },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${tab === t.key ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{t.label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 md:gap-4">
        <div className="card p-3 md:p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Sales</p>
          <p className="text-gray-900 text-lg md:text-2xl font-bold mt-1">{formatCurrency(totalSales)}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Expenses</p>
          <p className="text-red-600 text-lg md:text-2xl font-bold mt-1">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Ingredients</p>
          <p className="text-orange-600 text-lg md:text-2xl font-bold mt-1">{formatCurrency(totalCOGS)}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Net Profit</p>
          <p className={`text-lg md:text-2xl font-bold mt-1 ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(netProfit)}</p>
        </div>
        <div className="card p-3 md:p-4">
          <p className="text-gray-500 text-xs uppercase tracking-wide font-medium">Profit Margin</p>
          <p className={`text-lg md:text-2xl font-bold mt-1 ${profitMargin !== null && profitMargin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {profitMargin !== null ? `${profitMargin.toFixed(1)}%` : '—'}
          </p>
        </div>
      </div>

      {tab === 'sales' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            <div className="card p-4 md:p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-1">Daily Sales</h2>
              <p className="text-gray-500 text-sm mb-4">Avg: {formatCurrency(avgDaily)}/day</p>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} labelStyle={{ color: '#374151' }} />
                    <Bar dataKey="sales" fill="#b56722" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card p-4 md:p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales by Category</h2>
              {categoryData.length > 0 ? (
                <div className="h-48 md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={categoryData} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80}
                        label={({ category, percent }) => `${category} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {categoryData.map((_, idx) => <Cell key={idx} fill={COLORS[idx % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-gray-400 text-sm">No category sales data yet</p>}
            </div>
          </div>

          <div className="card p-4 md:p-5">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profit Margin Analysis</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-sm">
                    <th className="text-left p-3 font-medium">Product</th>
                    <th className="text-right p-3 font-medium">Cost Price</th>
                    <th className="text-right p-3 font-medium">Sell Price</th>
                    <th className="text-right p-3 font-medium">Margin %</th>
                    <th className="text-right p-3 font-medium">Profit per Unit</th>
                  </tr>
                </thead>
                <tbody>
                  {query<{ name: string; costPrice: number; sellPrice: number | null }>('SELECT name, cost_price, sell_price FROM products ORDER BY name').map((p) => {
                    const margin = p.sellPrice !== null ? ((p.sellPrice - p.costPrice) / p.sellPrice) * 100 : null
                    const profit = p.sellPrice !== null ? p.sellPrice - p.costPrice : null
                    return (
                      <tr key={p.name} className="border-b border-gray-100">
                        <td className="p-3 text-gray-900">{p.name}</td>
                        <td className="p-3 text-right text-gray-700">{formatCurrency(p.costPrice)}</td>
                        <td className="p-3 text-right text-gray-700">{p.sellPrice !== null ? formatCurrency(p.sellPrice) : '—'}</td>
                        <td className={`p-3 text-right font-medium ${margin !== null && margin >= 50 ? 'text-emerald-600' : 'text-amber-600'}`}>{margin !== null ? `${margin.toFixed(1)}%` : '—'}</td>
                        <td className="p-3 text-right text-gray-700">{profit !== null ? formatCurrency(profit) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'monthly' && (() => {
        const monthlyData = monthlySales.map(s => {
          const exp = monthlyExpenses.find(e => e.month === s.month)
          const cogs = monthlyCOGS.find(c => c.month === s.month)
          const expenses = exp?.expenses || 0
          const ingredientCost = cogs?.cogs || 0
          const totalExpenses = expenses + ingredientCost
          const netProfit = s.sales - totalExpenses
          const margin = s.sales > 0 ? (netProfit / s.sales) * 100 : null
          return { ...s, expenses, ingredientCost, totalExpenses, netProfit, margin }
        }).reverse()
        const totalRev = monthlyData.reduce((s, m) => s + m.sales, 0)
        const totalExp = monthlyData.reduce((s, m) => s + m.totalExpenses, 0)
        const totalProfit = monthlyData.reduce((s, m) => s + m.netProfit, 0)
        return (
          <div className="space-y-4 md:space-y-6">
            <div className="card p-4 md:p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calendar size={18} className="text-gray-400" /> 12-Month Overview</h2>
              {monthlyData.length === 0 || monthlyData.every(m => m.sales === 0) ? (
                <p className="text-gray-400 text-sm">No monthly data available</p>
              ) : (
                <div className="h-56 md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" stroke="#9ca3af" tick={{ fontSize: 10 }} />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="sales" name="Revenue" fill="#b56722" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="totalExpenses" name="Total Expenses" fill="#ef4444" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="netProfit" name="Net Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="flex gap-4 mt-3 justify-center text-sm">
                <span className="text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-[#b56722]" /> Revenue</span>
                <span className="text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500" /> Expenses</span>
                <span className="text-gray-500 flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500" /> Net Profit</span>
              </div>
            </div>

            <div className="card overflow-hidden">
              <div className="p-4 md:p-5 pb-0">
                <h2 className="text-lg font-semibold text-gray-900 mb-1">Monthly Breakdown</h2>
                <p className="text-gray-500 text-sm mb-4">Revenue, expenses, and profit by month</p>
              </div>
              <div className="md:hidden px-4 md:px-5 pb-4 space-y-3">
                {monthlyData.map(m => (
                  <div key={m.month} className="card p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-gray-900 font-medium">{m.label}</p>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${m.netProfit >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{m.margin !== null ? `${m.margin.toFixed(1)}%` : '—'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-gray-500">Revenue</span><p className="text-gray-900 font-medium">{formatCurrency(m.sales)}</p></div>
                      <div><span className="text-gray-500">Ingredients</span><p className="text-orange-600 font-medium">{formatCurrency(m.ingredientCost)}</p></div>
                      <div><span className="text-gray-500">Expenses</span><p className="text-red-600 font-medium">{formatCurrency(m.expenses)}</p></div>
                      <div><span className="text-gray-500">Net Profit</span><p className={`font-medium ${m.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(m.netProfit)}</p></div>
                    </div>
                    <p className="text-gray-400 text-xs mt-2">{m.transactions} transactions</p>
                  </div>
                ))}
              </div>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-sm">
                      <th className="text-left p-4 font-medium">Month</th>
                      <th className="text-right p-4 font-medium">Revenue</th>
                      <th className="text-right p-4 font-medium">Ingredients</th>
                      <th className="text-right p-4 font-medium">Expenses</th>
                      <th className="text-right p-4 font-medium">Total Costs</th>
                      <th className="text-right p-4 font-medium">Net Profit</th>
                      <th className="text-right p-4 font-medium">Margin</th>
                      <th className="text-right p-4 font-medium">Txns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map(m => (
                      <tr key={m.month} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-900 font-medium">{m.label}</td>
                        <td className="p-4 text-right text-gray-900">{formatCurrency(m.sales)}</td>
                        <td className="p-4 text-right text-orange-600">{formatCurrency(m.ingredientCost)}</td>
                        <td className="p-4 text-right text-red-600">{formatCurrency(m.expenses)}</td>
                        <td className="p-4 text-right text-gray-700">{formatCurrency(m.totalExpenses)}</td>
                        <td className={`p-4 text-right font-medium ${m.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(m.netProfit)}</td>
                        <td className={`p-4 text-right font-medium ${m.margin !== null && m.margin >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{m.margin !== null ? `${m.margin.toFixed(1)}%` : '—'}</td>
                        <td className="p-4 text-right text-gray-500">{m.transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300 font-semibold text-sm">
                      <td className="p-4 text-gray-900">Total</td>
                      <td className="p-4 text-right text-gray-900">{formatCurrency(totalRev)}</td>
                      <td className="p-4 text-right text-orange-600">{formatCurrency(monthlyData.reduce((s, m) => s + m.ingredientCost, 0))}</td>
                      <td className="p-4 text-right text-red-600">{formatCurrency(monthlyData.reduce((s, m) => s + m.expenses, 0))}</td>
                      <td className="p-4 text-right text-gray-700">{formatCurrency(totalExp)}</td>
                      <td className={`p-4 text-right ${totalProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{formatCurrency(totalProfit)}</td>
                      <td className={`p-4 text-right ${totalRev > 0 ? ((totalProfit / totalRev) * 100 >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-gray-400'}`}>{totalRev > 0 ? `${((totalProfit / totalRev) * 100).toFixed(1)}%` : '—'}</td>
                      <td className="p-4 text-right text-gray-500">{monthlyData.reduce((s, m) => s + m.transactions, 0)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>
        )
      })()}

      {tab === 'menu' && (
        <div className="card p-4 md:p-5">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 size={20} className="text-gray-400" />
            <h2 className="text-lg font-semibold text-gray-900">Menu Engineering Matrix</h2>
          </div>
          <p className="text-gray-500 text-sm mb-4">Classification based on sales volume and profit margin</p>
          {menuEngineering.length === 0 ? (
            <p className="text-gray-400 text-sm">No menu data available</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-500 text-sm">
                    <th className="text-left p-3 font-medium">Item</th>
                    <th className="text-left p-3 font-medium">Category</th>
                    <th className="text-right p-3 font-medium">Sold</th>
                    <th className="text-right p-3 font-medium">Revenue</th>
                    <th className="text-right p-3 font-medium">Margin %</th>
                    <th className="text-right p-3 font-medium">Classification</th>
                  </tr>
                </thead>
                <tbody>
                  {menuEngineering.map((item) => {
                    const qty = item.quantitySold || 0
                    const margin = item.avgMargin || 0
                    const cls = getClassification(qty, margin)
                    return (
                      <tr key={item.menuItemId} className="border-b border-gray-100">
                        <td className="p-3 text-gray-900 font-medium">{item.name}</td>
                        <td className="p-3 text-gray-500">{item.category}</td>
                        <td className="p-3 text-right text-gray-700">{qty}</td>
                        <td className="p-3 text-right text-gray-700">{formatCurrency(item.totalRevenue || 0)}</td>
                        <td className="p-3 text-right text-gray-700">{margin.toFixed(1)}%</td>
                        <td className="p-3 text-right">
                          <span className={`text-xs font-semibold px-2 py-1 rounded-full ring-1 ${cls.color}`}>{cls.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'trends' && (
        <div className="card p-4 md:p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">30-Day Sales Trend</h2>
          {trendData.length === 0 ? (
            <p className="text-gray-400 text-sm">No trend data available</p>
          ) : (
            <div className="h-64 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="sales" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="txns" orientation="right" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Line yAxisId="sales" type="monotone" dataKey="sales" stroke="#b56722" strokeWidth={2} dot={false} />
                  <Line yAxisId="txns" type="monotone" dataKey="transactions" stroke="#6b7280" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
          <div className="flex gap-4 mt-3 justify-center text-sm">
            <span className="text-gray-500 flex items-center gap-1.5"><span className="w-3 h-0.5 bg-coffee-600 rounded" /> Sales ($)</span>
            <span className="text-gray-500 flex items-center gap-1.5"><span className="w-3 h-0.5 bg-gray-400 rounded" /> Transactions</span>
          </div>
        </div>
      )}

      {tab === 'expenses' && (
        <div className="space-y-4 md:space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Expenses</h2>
            <button onClick={() => setShowAddExpense(true)}
              className="btn-primary flex items-center gap-1.5 text-xs sm:text-sm">
              <Plus size={16} /> Add Expense
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Ingredient Costs (COGS)</h3>
              <p className="text-orange-600 text-2xl font-bold">{formatCurrency(totalCOGS)}</p>
              <p className="text-gray-500 text-xs mt-1">Cost of all recipes sold this period</p>
            </div>
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-1">Manual Expenses</h3>
              <p className="text-red-600 text-2xl font-bold">{formatCurrency(totalExpenses)}</p>
              <p className="text-gray-500 text-xs mt-1">Rent, utilities, supplies, etc.</p>
            </div>
          </div>

          {cogsByDay.some(d => d.cogs > 0) && (
            <div className="card p-4 md:p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Daily Ingredient Costs</h3>
              <div className="h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={cogsByDay.map(d => ({ date: format(new Date(d.date), 'MMM dd'), cogs: d.cogs }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="cogs" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {expensesByCategory.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {expensesByCategory.map(ec => (
                <div key={ec.category} className="card p-3">
                  <p className="text-gray-500 text-xs font-medium">{ec.category}</p>
                  <p className="text-gray-900 font-semibold">{formatCurrency(ec.total)}</p>
                </div>
              ))}
            </div>
          )}

          {expenses.length === 0 ? (
            <div className="text-center text-gray-400 mt-8">
              <Receipt size={40} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">No expenses recorded for this period</p>
            </div>
          ) : (
            <>
              <div className="md:hidden space-y-3">
                {expenses.map(e => (
                  <div key={e.id} className="card p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-gray-900 font-medium truncate">{e.description}</p>
                        <p className="text-gray-500 text-xs mt-0.5">{e.date}</p>
                      </div>
                      <p className="text-red-600 font-semibold whitespace-nowrap">{formatCurrency(e.amount)}</p>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{e.category}</span>
                      <button onClick={() => handleDeleteExpense(e.id)}
                        className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block card overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500 text-sm">
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Description</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-right p-4 font-medium">Amount</th>
                      <th className="text-right p-4 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map(e => (
                      <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-4 text-gray-500 text-sm">{e.date}</td>
                        <td className="p-4 text-gray-900">{e.description}</td>
                        <td className="p-4">
                          <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">{e.category}</span>
                        </td>
                        <td className="p-4 text-right text-red-600 font-medium">{formatCurrency(e.amount)}</td>
                        <td className="p-4 text-right">
                          <button onClick={() => handleDeleteExpense(e.id)}
                            className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      )}

      {showAddExpense && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50">
          <div className="card p-6 w-full sm:w-96 rounded-t-xl sm:rounded-xl shadow-modal">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Expense</h2>
            <div className="space-y-3">
              <div>
                <label className="text-gray-700 text-sm block mb-1 font-medium">Description</label>
                <input type="text" value={expDesc} onChange={e => setExpDesc(e.target.value)}
                  placeholder="e.g. Monthly rent, Coffee beans delivery"
                  className="input-base" />
              </div>
              <div>
                <label className="text-gray-700 text-sm block mb-1 font-medium">Amount</label>
                <input type="number" step="0.01" min="0" value={expAmount} onChange={e => setExpAmount(e.target.value)}
                  placeholder="0.00"
                  className="input-base" />
              </div>
              <div>
                <label className="text-gray-700 text-sm block mb-1 font-medium">Category</label>
                <select value={expCategory} onChange={e => setExpCategory(e.target.value)}
                  className="input-base">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-gray-700 text-sm block mb-1 font-medium">Date</label>
                <input type="date" value={expDate} onChange={e => setExpDate(e.target.value)}
                  className="input-base" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddExpense(false); setExpDesc(''); setExpAmount('') }}
                className="btn-secondary flex-1">Cancel</button>
              <button onClick={handleAddExpense} disabled={!expDesc.trim() || !expAmount}
                className="btn-primary flex-1">Add</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
