import { useState, useEffect } from 'react'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UserSettings {
  totalCapital: number
  riskPerTrade: number
}

function Settings() {
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    totalCapital: 0,
    riskPerTrade: 1
  })

  useEffect(() => {
    loadSettings()
  }, [user])

  const loadSettings = async () => {
    try {
      setIsLoading(true)
      const userSettings = await db.getUserSettings(user?.id || '')
      
      if (userSettings) {
        setSettings({
          totalCapital: userSettings.total_capital || 0,
          riskPerTrade: userSettings.risk_per_trade || 1
        })
      }
    } catch (error) {
      console.error('Error loading settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      await db.updateUserSettings({
        user_id: user?.id || '',
        total_capital: settings.totalCapital,
        risk_per_trade: settings.riskPerTrade
      })

      setSuccess('Settings saved successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Settings</h1>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Risk Management Settings */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Risk Management</h2>
          
          <div className="space-y-6">
            <div>
              <label htmlFor="totalCapital" className="block text-sm font-medium text-gray-700">
                Total Capital
              </label>
              <div className="mt-2 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="totalCapital"
                  id="totalCapital"
                  value={settings.totalCapital}
                  onChange={(e) => setSettings(prev => ({ ...prev, totalCapital: parseFloat(e.target.value) || 0 }))}
                  className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="riskPerTrade" className="block text-sm font-medium text-gray-700">
                Risk Per Trade (%)
              </label>
              <div className="mt-2 relative rounded-lg shadow-sm">
                <input
                  type="number"
                  name="riskPerTrade"
                  id="riskPerTrade"
                  value={settings.riskPerTrade}
                  onChange={(e) => setSettings(prev => ({ ...prev, riskPerTrade: parseFloat(e.target.value) || 0 }))}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  step="0.1"
                  min="0"
                  max="100"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                This is the maximum percentage of your capital you're willing to risk on a single trade.
              </p>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={loading}
              className="px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 