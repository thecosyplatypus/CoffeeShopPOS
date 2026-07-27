import { useAppStore } from '@/store'
import { logout } from '@/services/auth'
import { ShoppingCart, LayoutDashboard, Package, BarChart3, Settings, Sliders, ChefHat, LogOut, Menu, WifiOff, Wifi } from 'lucide-react'

const navItems = [
  { href: '/pos', icon: ShoppingCart, label: 'POS' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/recipes', icon: ChefHat, label: 'Recipes' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
  { href: '/admin', icon: Settings, label: 'Admin' },
  { href: '/settings', icon: Sliders, label: 'Settings' },
]

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, sidebarOpen, toggleSidebar, isOnline } = useAppStore()
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-white border-r border-gray-200 flex flex-col transition-all duration-200 shadow-sidebar`}>
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-coffee-600 flex items-center justify-center">
                <span className="text-white text-sm font-bold">C</span>
              </div>
              <span className="font-bold text-gray-900 text-lg">CoffeeShop</span>
            </div>
          )}
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><Menu size={20} /></button>
        </div>

        <nav className="flex-1 p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive = window.location.hash === item.href || window.location.hash === '#' + item.href
            return (
              <a key={item.href} href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-coffee-50 text-coffee-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
                onClick={(e) => { e.preventDefault(); window.location.hash = item.href }}>
                <item.icon size={20} />
                {sidebarOpen && <span>{item.label}</span>}
              </a>
            )
          })}
        </nav>

        <div className="p-3 border-t border-gray-100 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            {isOnline ? <Wifi size={14} className="text-green-500" /> : <WifiOff size={14} className="text-red-500" />}
            {sidebarOpen && <span className="text-gray-500">{isOnline ? 'Online' : 'Offline'}</span>}
          </div>
          {sidebarOpen && user && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-coffee-100 text-coffee-700 flex items-center justify-center text-xs font-bold shrink-0">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.role}</p>
              </div>
            </div>
          )}
          <button onClick={() => { logout(); useAppStore.getState().setUser(null); window.location.hash = '/login' }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-sm transition-colors">
            <LogOut size={16} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
