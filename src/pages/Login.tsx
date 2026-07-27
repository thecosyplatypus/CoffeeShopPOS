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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-80 shadow-modal border border-gray-200">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-coffee-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            <Coffee size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">CoffeeShop POS</h1>
          <p className="text-gray-500 text-sm mt-1">Enter your PIN</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Smartphone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
              className="input-base pl-10 text-center text-2xl tracking-widest py-3"
              placeholder="PIN"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4}
            className="w-full bg-coffee-600 hover:bg-coffee-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}
