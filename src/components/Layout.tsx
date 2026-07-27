import { useState, useEffect } from 'react'
import { useAppStore } from '@/store'
import { logout } from '@/services/auth'
import { ShoppingCart, LayoutDashboard, Package, BarChart3, Settings, Sliders, ChefHat, LogOut, Menu, WifiOff, Wifi, MoreHorizontal, X } from 'lucide-react'

const primaryNav = [
  { href: '/pos', icon: ShoppingCart, label: 'POS' },
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/inventory', icon: Package, label: 'Inventory' },
  { href: '/reports', icon: BarChart3, label: 'Reports' },
]

const secondaryNav = [
  { href: '/recipes', icon: ChefHat, label: 'Recipes' },
  { href: '/admin', icon: Settings, label: 'Admin' },
  { href: '/settings', icon: Sliders, label: 'Settings' },
]

const allNav = [...primaryNav, ...secondaryNav]

function useHashPath() {
  const [path, setPath] = useState(window.location.hash || '#/pos')
  useEffect(() => {
    const handler = () => setPath(window.location.hash || '#/pos')
    window.addEventListener('hashchange', handler)
    return () => window.removeEventListener('hashchange', handler)
  }, [])
  return path
}

function navigate(href: string) {
  window.location.hash = href
}

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, sidebarOpen, toggleSidebar, isOnline } = useAppStore()
  const path = useHashPath()
  const [showMore, setShowMore] = useState(false)
  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '??'

  const isActive = (href: string) => path === href || path === '#' + href
  const isSecondaryActive = secondaryNav.some(n => isActive(n.href))

  const handleNav = (href: string) => {
    navigate(href)
    setShowMore(false)
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop sidebar */}
      <aside className={`${sidebarOpen ? 'w-56' : 'w-16'} bg-white border-r border-gray-200 flex-col transition-all duration-200 shadow-sidebar hidden md:flex`}>
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
          {allNav.map((item) => (
            <a key={item.href} href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.href)
                  ? 'bg-coffee-50 text-coffee-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
              onClick={(e) => { e.preventDefault(); handleNav(item.href) }}>
              <item.icon size={20} />
              {sidebarOpen && <span>{item.label}</span>}
            </a>
          ))}
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
          <button onClick={() => { logout(); useAppStore.getState().setUser(null); navigate('/login') }}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg hover:bg-gray-50 text-gray-500 hover:text-gray-700 text-sm transition-colors">
            <LogOut size={16} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Mobile layout */}
      <div className="flex flex-col flex-1 md:hidden">
        {/* Mobile header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-coffee-600 flex items-center justify-center">
              <span className="text-white text-sm font-bold">C</span>
            </div>
            <span className="font-bold text-gray-900">CoffeeShop</span>
          </div>
          <div className="flex items-center gap-3">
            {isOnline ? <Wifi size={16} className="text-green-500" /> : <WifiOff size={16} className="text-red-500" />}
            {user && (
              <div className="w-8 h-8 rounded-full bg-coffee-100 text-coffee-700 flex items-center justify-center text-xs font-bold">
                {initials}
              </div>
            )}
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 overflow-auto pb-16">{children}</main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 flex items-stretch z-40" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          {primaryNav.map((item) => (
            <button key={item.href} onClick={() => handleNav(item.href)}
              className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px] ${
                isActive(item.href)
                  ? 'text-coffee-600'
                  : 'text-gray-500 active:text-gray-700'
              }`}>
              <item.icon size={22} strokeWidth={isActive(item.href) ? 2.5 : 1.8} />
              <span className={`text-[10px] ${isActive(item.href) ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
            </button>
          ))}
          <button onClick={() => setShowMore(!showMore)}
            className={`flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors min-h-[56px] ${
              isSecondaryActive && !showMore
                ? 'text-coffee-600'
                : showMore
                  ? 'text-coffee-600'
                  : 'text-gray-500 active:text-gray-700'
            }`}>
            {showMore ? <X size={22} strokeWidth={2.5} /> : <MoreHorizontal size={22} strokeWidth={1.8} />}
            <span className={`text-[10px] ${showMore ? 'font-semibold' : 'font-medium'}`}>More</span>
          </button>
        </nav>

        {/* More menu overlay */}
        {showMore && (
          <>
            <div className="fixed inset-0 bg-black/20 z-30" onClick={() => setShowMore(false)} />
            <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom,0px))] inset-x-0 bg-white border-t border-gray-200 shadow-lg z-30 p-2 space-y-0.5">
              {secondaryNav.map((item) => (
                <button key={item.href} onClick={() => handleNav(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'bg-coffee-50 text-coffee-700'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}>
                  <item.icon size={20} />
                  <span>{item.label}</span>
                </button>
              ))}
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => { logout(); useAppStore.getState().setUser(null); handleNav('/login') }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors">
                <LogOut size={20} />
                <span>Logout</span>
              </button>
            </div>
          </>
        )}
      </div>

      {/* Desktop main content */}
      <main className="flex-1 overflow-auto hidden md:block">{children}</main>
    </div>
  )
}
