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

  return (
    <div className="flex h-screen bg-coffee-950 text-white">
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-coffee-900 border-r border-coffee-800 flex flex-col transition-all duration-200`}>
        <div className="flex items-center justify-between p-3 border-b border-coffee-800">
          {sidebarOpen && <span className="font-bold text-coffee-300 text-lg">CoffeeShop</span>}
          <button onClick={toggleSidebar} className="p-1.5 rounded-lg hover:bg-coffee-800 text-coffee-400"><Menu size={20} /></button>
        </div>

        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-coffee-800 text-coffee-300 hover:text-white transition-colors"
              onClick={(e) => { e.preventDefault(); window.location.hash = item.href }}>
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </a>
          ))}
        </nav>

        <div className="p-3 border-t border-coffee-800 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            {isOnline ? <Wifi size={14} className="text-green-400" /> : <WifiOff size={14} className="text-red-400" />}
            {sidebarOpen && <span className="text-coffee-400">{isOnline ? 'Online' : 'Offline'}</span>}
          </div>
          {sidebarOpen && user && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-coffee-300 truncate">{user.name}</span>
              <span className="text-coffee-500 uppercase">{user.role}</span>
            </div>
          )}
          <button onClick={() => { logout(); useAppStore.getState().setUser(null); window.location.hash = '/login' }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-coffee-800 text-coffee-400 text-sm">
            <LogOut size={16} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
