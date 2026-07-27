import { useEffect, useState } from 'react'
import { getEODReport, getLowStockProducts, getStockAlerts, getBestSellers, getPeakHours, getSalesByEmployee, getSalesByPaymentMethod, getWasteLogs, getMonthlySales } from '@/services/inventory'
import { formatCurrency } from '@/utils/format'
import { format } from 'date-fns'
import { TrendingUp, ShoppingCart, AlertTriangle, Package, Users, Clock, CreditCard, Trash2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function DashboardPage() {
  const [report, setReport] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [bestSellers, setBestSellers] = useState<any[]>([])
  const [peakHours, setPeakHours] = useState<any[]>([])
  const [employeeSales, setEmployeeSales] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [wasteLogs, setWasteLogs] = useState<any[]>([])
  const [monthlySales, setMonthlySales] = useState<any[]>([])
  const [days, setDays] = useState(7)

  const [error, setError] = useState('')

  const loadDashboardData = () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      setReport(getEODReport(today))
      setAlerts(getStockAlerts())
      setLowStock(getLowStockProducts())
      setBestSellers(getBestSellers(days))
      setPeakHours(getPeakHours(days))
      setEmployeeSales(getSalesByEmployee(days))
      setPaymentMethods(getSalesByPaymentMethod(days))
      setWasteLogs(getWasteLogs())
      setMonthlySales(getMonthlySales(12).map(m => ({ month: m.label, sales: m.sales, transactions: m.transactions })))
      setError('')
    } catch (err: any) {
      console.error('[Dashboard] Failed to load data:', err)
      setError(err?.message || 'Failed to load dashboard data')
    }
  }

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(() => loadDashboardData(), 30000)
    return () => clearInterval(interval)
  }, [days])

  const totalWaste = wasteLogs.reduce((s, w) => s + w.quantity, 0)

  const stats = [
    { label: "Today's Sales", value: report ? formatCurrency(report.totalSales) : formatCurrency(0), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Transactions', value: report ? report.totalTransactions : 0, icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Low Stock Items', value: lowStock.length, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Products Tracked', value: report?.usage?.length || 0, icon: Package, color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Dashboard</h1>
        <div className="card p-6 border-red-200 bg-red-50">
          <p className="text-red-700 font-semibold mb-2">Failed to load dashboard</p>
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={loadDashboardData} className="btn-primary mt-4">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex gap-1.5">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-2.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors ${days === d ? 'bg-coffee-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{d}d</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-3 md:p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs md:text-sm">{stat.label}</p>
                <p className="text-gray-900 text-lg md:text-2xl font-bold mt-0.5 md:mt-1">{stat.value}</p>
              </div>
              <div className={`w-9 h-9 md:w-12 md:h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={20} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="card p-4 md:p-5">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3 md:mb-4">Best Sellers ({days}d)</h2>
          {bestSellers.length === 0 ? (
            <p className="text-gray-400 text-sm">No sales data yet</p>
          ) : (
            <div className="space-y-2">
              {bestSellers.slice(0, 8).map((item, i) => (
                <div key={item.menuItemId} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 text-sm w-5">{i + 1}</span>
                    <div>
                      <p className="text-gray-900 text-sm font-medium">{item.name}</p>
                      <p className="text-gray-500 text-xs">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-900 text-sm font-medium">{item.totalSold} sold</p>
                    <p className="text-gray-500 text-xs">{formatCurrency(item.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Clock size={18} className="text-gray-400" /> Peak Hours ({days}d)</h2>
          {peakHours.length === 0 ? (
            <p className="text-gray-400 text-sm">No hourly data yet</p>
          ) : (
            <div className="space-y-1.5">
              {peakHours.map((ph) => {
                const maxCount = Math.max(...peakHours.map(p => p.count))
                const pct = maxCount > 0 ? (ph.count / maxCount) * 100 : 0
                return (
                  <div key={ph.hour} className="flex items-center gap-3">
                    <span className="text-gray-500 text-xs w-12 text-right">{String(ph.hour).padStart(2, '0')}:00</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
                      <div className="bg-coffee-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-gray-600 text-xs w-16 text-right">{ph.count} orders</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><Users size={18} className="text-gray-400" /> Employee Sales ({days}d)</h2>
          {employeeSales.length === 0 ? (
            <p className="text-gray-400 text-sm">No employee sales data yet</p>
          ) : (
            <div className="space-y-2">
              {employeeSales.map((es) => (
                <div key={es.userId} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <div>
                    <p className="text-gray-900 text-sm font-medium">{es.name}</p>
                    <p className="text-gray-500 text-xs">{es.transactionCount} transactions</p>
                  </div>
                  <span className="text-gray-900 font-semibold">{formatCurrency(es.totalSales)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><CreditCard size={18} className="text-gray-400" /> Payment Methods ({days}d)</h2>
          {paymentMethods.length === 0 ? (
            <p className="text-gray-400 text-sm">No payment data yet</p>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div key={pm.method} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div>
                    <p className="text-gray-900 text-sm font-medium capitalize">{pm.method}</p>
                    <p className="text-gray-500 text-xs">{pm.count} transactions</p>
                  </div>
                  <span className="text-gray-900 font-semibold">{formatCurrency(pm.total)}</span>
                </div>
              ))}
            </div>
          )}
          {wasteLogs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-600 mb-2 flex items-center gap-1.5"><Trash2 size={14} /> Recent Waste</h3>
              <div className="space-y-1.5 max-h-32 overflow-auto">
                {wasteLogs.slice(0, 5).map(w => (
                  <div key={w.id} className="flex justify-between text-xs">
                    <span className="text-gray-600">{w.productName} — {w.reason}</span>
                    <span className="text-red-500">{w.quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-400 text-sm">All stock levels are healthy</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.product.id} className={`flex items-center justify-between p-3 rounded-lg ${alert.alertLevel === 'critical' ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                  <div>
                    <p className="text-gray-900 text-sm font-medium">{alert.product.name}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{alert.product.stockLevel} {alert.product.unit} remaining</p>
                  </div>
                  <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${alert.alertLevel === 'critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{alert.alertLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-5">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Product Usage</h2>
          {report?.usage?.length > 0 ? (
            <div className="space-y-2">
              {report.usage.slice(0, 8).map((u: any) => (
                <div key={u.productId} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50">
                  <span className="text-gray-900 text-sm">{u.productName}</span>
                  <span className="text-gray-500 text-sm">{u.theoreticalUsage.toFixed(1)} {u.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No sales recorded today</p>
          )}
        </div>
      </div>

      {monthlySales.length > 0 && monthlySales.some(m => m.sales > 0) && (
        <div className="card p-4 md:p-5">
          <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-1">12-Month Revenue</h2>
          <p className="text-gray-500 text-sm mb-4">Total: {formatCurrency(monthlySales.reduce((s, m) => s + m.sales, 0))}</p>
          <div className="h-48 md:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySales}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="sales" fill="#b56722" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}
