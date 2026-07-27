import { useState, useRef, useEffect } from 'react'
import { login, hasAnyUsers } from '@/services/auth'
import { useAppStore } from '@/store'
import { Coffee, Smartphone } from 'lucide-react'

export function LoginPage() {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const setUser = useAppStore((s) => s.setUser)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const user = await login(pin)
    if (user) {
      setUser(user)
      window.location.hash = '/pos'
    } else {
      setError('Invalid PIN')
      setPin('')
    }
  }

  return (
    <div className="min-h-screen bg-coffee-950 flex items-center justify-center">
      <div className="bg-coffee-900 rounded-2xl p-8 w-80 shadow-2xl border border-coffee-800">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-coffee-800 rounded-full flex items-center justify-center mb-3">
            <Coffee size={32} className="text-coffee-400" />
          </div>
          <h1 className="text-xl font-bold text-white">CoffeeShop POS</h1>
          <p className="text-coffee-400 text-sm mt-1">Enter your PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-400" />
            <input
              ref={inputRef}
              type="password"
              maxLength={6}
              inputMode="numeric"
              pattern="[0-9]*"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              className="w-full bg-coffee-950 border border-coffee-700 rounded-lg px-10 py-3 text-center text-2xl tracking-widest text-white placeholder-coffee-600 focus:outline-none focus:ring-2 focus:ring-coffee-500"
              placeholder="PIN"
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full bg-coffee-600 hover:bg-coffee-500 disabled:bg-coffee-800 disabled:text-coffee-600 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
