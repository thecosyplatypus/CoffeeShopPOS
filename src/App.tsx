import { useEffect, useState, useCallback, Component, type ReactNode } from 'react'
import { useAppStore } from '@/store'
import { useSettingsStore } from '@/store/settings'
import { initDatabase, seedDatabase, persistDatabase } from '@/services/db'
import { hasAnyUsers, restoreSession } from '@/services/auth'
import { startAutoSync } from '@/services/sync'
import { Layout } from '@/components/Layout'
import { LoginPage } from '@/pages/Login'
import { SetupPage } from '@/pages/Setup'
import { POSPage } from '@/pages/POS'
import { DashboardPage } from '@/pages/Dashboard'
import { InventoryPage } from '@/pages/Inventory'
import { ReportsPage } from '@/pages/Reports'
import { AdminPage } from '@/pages/Admin'
import { SettingsPage } from '@/pages/Settings'
import { RecipesPage } from '@/pages/Recipes'

function getHash(): string {
  if (typeof window === 'undefined') return '/pos'
  const hash = window.location.hash.slice(1)
  return hash.split('?')[0] || '/pos'
}

class PageErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null }
  static getDerivedStateFromError(err: any) { return { error: err?.message || 'Page failed to render' } }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6">
          <div className="bg-red-900/30 border border-red-800 rounded-xl p-6">
            <p className="text-red-300 font-semibold mb-2">Something went wrong</p>
            <p className="text-red-400 text-sm mb-4">{this.state.error}</p>
            <button onClick={() => { this.setState({ error: null }); window.location.hash = '/pos' }}
              className="px-4 py-2 rounded-lg bg-coffee-700 hover:bg-coffee-600 text-white text-sm">Go to POS</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export function App() {
  const { user, setUser, needsSetup, setNeedsSetup, setOnline } = useAppStore()
  const [page, setPage] = useState(getHash())
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')

  const init = useCallback(async () => {
    try {
      useSettingsStore.getState().load()
      await initDatabase()
      await seedDatabase()
      const hasUsers = await hasAnyUsers()
      setNeedsSetup(!hasUsers)
      if (hasUsers) {
        const savedUser = restoreSession()
        if (savedUser) setUser(savedUser)
      }
      setReady(true)
    } catch (err: any) {
      setError(err?.message || 'Failed to initialize database')
    }
  }, [])

  useEffect(() => {
    init()
    startAutoSync(30000)

    const handleHash = () => setPage(getHash())
    window.addEventListener('hashchange', handleHash)

    const handleOnline = () => setOnline(true)
    const handleOffline = () => setOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    const handleBeforeUnload = () => { persistDatabase() }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('hashchange', handleHash)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [init])

  if (error) {
    return (
      <div className="min-h-screen bg-coffee-950 flex flex-col items-center justify-center p-4">
        <div className="bg-red-900/30 border border-red-800 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-300 text-lg font-semibold mb-2">Startup Error</p>
          <p className="text-red-400 text-sm mb-4">{error}</p>
          <p className="text-coffee-400 text-xs">Check the browser console for details. Ensure the app has internet access for the first load.</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center">
        <div className="text-coffee-400 text-lg animate-pulse">Loading...</div>
      </div>
    )
  }

  if (!user) {
    if (needsSetup) return <SetupPage />
    return <LoginPage />
  }

  const renderPage = () => {
    switch (page) {
      case '/dashboard': return <DashboardPage />
      case '/inventory': return <InventoryPage />
      case '/reports': return <ReportsPage />
      case '/admin': return <AdminPage />
      case '/recipes': return <RecipesPage />
      case '/settings': return <SettingsPage />
      default: return <POSPage />
    }
  }

  return <Layout><PageErrorBoundary>{renderPage()}</PageErrorBoundary></Layout>
}
