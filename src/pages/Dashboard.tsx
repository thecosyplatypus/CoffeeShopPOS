import { useEffect, useState } from 'react'
import { getEODReport, getLowStockProducts, getStockAlerts, getBestSellers, getPeakHours, getSalesByEmployee, getSalesByPaymentMethod, getWasteLogs } from '@/services/inventory'
import { formatCurrency } from '@/utils/format'
import { format } from 'date-fns'
import { TrendingUp, ShoppingCart, AlertTriangle, Package, Users, Clock, CreditCard, Trash2 } from 'lucide-react'

export function DashboardPage() {
  const [report, setReport] = useState<any>(null)
  const [alerts, setAlerts] = useState<any[]>([])
  const [lowStock, setLowStock] = useState<any[]>([])
  const [bestSellers, setBestSellers] = useState<any[]>([])
  const [peakHours, setPeakHours] = useState<any[]>([])
  const [employeeSales, setEmployeeSales] = useState<any[]>([])
  const [paymentMethods, setPaymentMethods] = useState<any[]>([])
  const [wasteLogs, setWasteLogs] = useState<any[]>([])
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
      setError('')
    } catch (err: any) {
      console.error('[Dashboard] Failed to load data:', err)
      setError(err?.message || 'Failed to load dashboard data')
    }
  }

  useEffect(() => {
    loadDashboardData()
    const interval = setInterval(() => loadDashboardData(), 15000)
    return () => clearInterval(interval)
  }, [days])

  const totalWaste = wasteLogs.reduce((s, w) => s + w.quantity, 0)

  const stats = [
    { label: "Today's Sales", value: report ? formatCurrency(report.totalSales) : formatCurrency(0), icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-900/30' },
    { label: 'Transactions', value: report ? report.totalTransactions : 0, icon: ShoppingCart, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { label: 'Low Stock Items', value: lowStock.length, icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-900/30' },
    { label: 'Products Tracked', value: report?.usage?.length || 0, icon: Package, color: 'text-purple-400', bg: 'bg-purple-900/30' },
  ]

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-white mb-4">Dashboard</h1>
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-6">
          <p className="text-red-300 font-semibold mb-2">Failed to load dashboard</p>
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={loadDashboardData} className="mt-4 px-4 py-2 rounded-lg bg-coffee-700 hover:bg-coffee-600 text-white text-sm">Retry</button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <div className="flex gap-2">
          {[7, 14, 30].map(d => (
            <button key={d} onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${days === d ? 'bg-coffee-700 text-white' : 'bg-coffee-900 text-coffee-400 hover:bg-coffee-800'}`}>{d} Days</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-coffee-900 border border-coffee-800 rounded-xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-coffee-400 text-sm">{stat.label}</p>
                <p className="text-white text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon size={24} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Best Sellers ({days}d)</h2>
          {bestSellers.length === 0 ? (
            <p className="text-coffee-500 text-sm">No sales data yet</p>
          ) : (
            <div className="space-y-2">
              {bestSellers.slice(0, 8).map((item, i) => (
                <div key={item.menuItemId} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-coffee-800">
                  <div className="flex items-center gap-3">
                    <span className="text-coffee-500 text-sm w-5">{i + 1}</span>
                    <div>
                      <p className="text-white text-sm font-medium">{item.name}</p>
                      <p className="text-coffee-500 text-xs">{item.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-coffee-200 text-sm font-medium">{item.totalSold} sold</p>
                    <p className="text-coffee-400 text-xs">{formatCurrency(item.totalRevenue)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Clock size={18} /> Peak Hours ({days}d)</h2>
          {peakHours.length === 0 ? (
            <p className="text-coffee-500 text-sm">No hourly data yet</p>
          ) : (
            <div className="space-y-1.5">
              {peakHours.map((ph) => {
                const maxCount = Math.max(...peakHours.map(p => p.count))
                const pct = maxCount > 0 ? (ph.count / maxCount) * 100 : 0
                return (
                  <div key={ph.hour} className="flex items-center gap-3">
                    <span className="text-coffee-400 text-xs w-12 text-right">{String(ph.hour).padStart(2, '0')}:00</span>
                    <div className="flex-1 bg-coffee-950 rounded-full h-5 overflow-hidden">
                      <div className="bg-coffee-600 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-coffee-300 text-xs w-16 text-right">{ph.count} orders</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Users size={18} /> Employee Sales ({days}d)</h2>
          {employeeSales.length === 0 ? (
            <p className="text-coffee-500 text-sm">No employee sales data yet</p>
          ) : (
            <div className="space-y-2">
              {employeeSales.map((es) => (
                <div key={es.userId} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-coffee-800">
                  <div>
                    <p className="text-white text-sm font-medium">{es.name}</p>
                    <p className="text-coffee-500 text-xs">{es.transactionCount} transactions</p>
                  </div>
                  <span className="text-coffee-200 font-semibold">{formatCurrency(es.totalSales)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><CreditCard size={18} /> Payment Methods ({days}d)</h2>
          {paymentMethods.length === 0 ? (
            <p className="text-coffee-500 text-sm">No payment data yet</p>
          ) : (
            <div className="space-y-3">
              {paymentMethods.map((pm) => (
                <div key={pm.method} className="flex items-center justify-between p-3 rounded-lg bg-coffee-950">
                  <div>
                    <p className="text-white text-sm font-medium capitalize">{pm.method}</p>
                    <p className="text-coffee-500 text-xs">{pm.count} transactions</p>
                  </div>
                  <span className="text-coffee-200 font-semibold">{formatCurrency(pm.total)}</span>
                </div>
              ))}
            </div>
          )}
          {wasteLogs.length > 0 && (
            <div className="mt-4 pt-4 border-t border-coffee-800">
              <h3 className="text-sm font-medium text-coffee-400 mb-2 flex items-center gap-1.5"><Trash2 size={14} /> Recent Waste</h3>
              <div className="space-y-1.5 max-h-32 overflow-auto">
                {wasteLogs.slice(0, 5).map(w => (
                  <div key={w.id} className="flex justify-between text-xs">
                    <span className="text-coffee-300">{w.productName} — {w.reason}</span>
                    <span className="text-red-400">{w.quantity} units</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Stock Alerts</h2>
          {alerts.length === 0 ? (
            <p className="text-coffee-500 text-sm">All stock levels are healthy</p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.product.id} className={`flex items-center justify-between p-3 rounded-lg ${alert.alertLevel === 'critical' ? 'bg-red-900/30 border border-red-800' : 'bg-amber-900/30 border border-amber-800'}`}>
                  <div>
                    <p className="text-white text-sm font-medium">{alert.product.name}</p>
                    <p className="text-coffee-400 text-xs mt-0.5">{alert.product.stockLevel} {alert.product.unit} remaining</p>
                  </div>
                  <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${alert.alertLevel === 'critical' ? 'bg-red-800 text-red-200' : 'bg-amber-800 text-amber-200'}`}>{alert.alertLevel}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-coffee-900 border border-coffee-800 rounded-xl p-5">
          <h2 className="text-lg font-semibold text-white mb-4">Today's Product Usage</h2>
          {report?.usage?.length > 0 ? (
            <div className="space-y-2">
              {report.usage.slice(0, 8).map((u: any) => (
                <div key={u.productId} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-coffee-800">
                  <span className="text-coffee-200 text-sm">{u.productName}</span>
                  <span className="text-coffee-400 text-sm">{u.theoreticalUsage.toFixed(1)} {u.unit}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-coffee-500 text-sm">No sales recorded today</p>
          )}
        </div>
      </div>
    </div>
  )
}
