import { useState } from 'react'
import { createAdmin } from '@/services/auth'
import { persistDatabase } from '@/services/db'
import { useAppStore } from '@/store'
import { Coffee, Eye, EyeOff } from 'lucide-react'

export function SetupPage() {
  const [name, setName] = useState('')
  const [pin, setPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState('')
  const setNeedsSetup = useAppStore((s) => s.setNeedsSetup)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!name.trim()) {
      setError('Name is required')
      return
    }

    if (pin.length < 4) {
      setError('PIN must be at least 4 digits')
      return
    }

    if (pin !== confirmPin) {
      setError('PINs do not match')
      return
    }

    if (!/^\d+$/.test(pin)) {
      setError('PIN must contain only numbers')
      return
    }

    try {
      await createAdmin(name.trim(), pin)
      await persistDatabase()
      setNeedsSetup(false)
    } catch (err: any) {
      setError(err.message || 'Failed to create admin account')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 w-full max-w-md shadow-modal border border-gray-200">
        <div className="flex flex-col items-center mb-6">
          <div className="w-16 h-16 bg-coffee-600 rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            <Coffee size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">Welcome to CoffeeShop POS</h1>
          <p className="text-gray-500 text-sm mt-1 text-center">
            First-time setup — create the admin account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-gray-700 text-sm block mb-1 font-medium">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jane Doe"
              className="input-base"
              autoFocus
            />
          </div>

          <div>
            <label className="text-gray-700 text-sm block mb-1 font-medium">Choose a PIN</label>
            <div className="relative">
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  setError('')
                }}
                placeholder="4-6 digit PIN"
                className="input-base pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-gray-700 text-sm block mb-1 font-medium">Confirm PIN</label>
            <input
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => {
                setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                setError('')
              }}
              placeholder="Re-enter your PIN"
              className="input-base"
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={!name.trim() || pin.length < 4 || pin !== confirmPin}
            className="w-full bg-coffee-600 hover:bg-coffee-700 disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 rounded-lg transition-colors"
          >
            Create Admin Account
          </button>
        </form>
      </div>
    </div>
  )
}
