import { useState, useEffect } from 'react'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { ReminderSettings } from '../components/ReminderSettings'

interface UserSettings {
  totalCapital: number
  riskPerTrade: number
}

function Settings() {
  const { user } = useAuth()
  const [newStrategy, setNewStrategy] = useState('')
  const [strategies, setStrategies] = useState<string[]>([])
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
    loadStrategies()
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

  const loadStrategies = async () => {
    try {
      const userStrategies = await db.getStrategies(user?.id || '')
      setStrategies(userStrategies)
    } catch (error) {
      console.error('Error loading strategies:', error)
    }
  }

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedStrategy = newStrategy.trim()
    
    if (!trimmedStrategy) {
      setError('Strategy name cannot be empty')
      return
    }
    
    if (strategies.includes(trimmedStrategy)) {
      setError('Strategy already exists')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await db.addStrategy(user?.id || '', trimmedStrategy)
      await loadStrategies() // Reload strategies after adding
      
      setNewStrategy('')
      setSuccess('Strategy added successfully')
    } catch (error) {
      setError('Failed to add strategy')
      console.error('Error adding strategy:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStrategy = async (strategy: string) => {
    if (!window.confirm(`Are you sure you want to delete the strategy "${strategy}"?`)) {
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      await db.deleteStrategy(user?.id || '', strategy)
      await loadStrategies() // Reload strategies after deleting
      
      setSuccess('Strategy deleted successfully')
    } catch (error) {
      setError('Failed to delete strategy')
      console.error('Error deleting strategy:', error)
    } finally {
      setLoading(false)
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

  const handleExport = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const data = await db.exportData()
      const blob = new Blob([data], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `trading-journal-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setSuccess('Data exported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export data')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      const text = await file.text()
      const data = JSON.parse(text)
      
      // Validate the data structure
      if (!Array.isArray(data.trades)) {
        throw new Error('Invalid data format')
      }

      // Process each trade to ensure it has the correct structure
      const processedTrades = data.trades.map((trade: any) => ({
        symbol: trade.symbol,
        type: trade.type,
        entry_date: trade.entry_date,
        exit_date: trade.exit_date,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        quantity: trade.quantity,
        strategy: trade.strategy,
        notes: trade.notes || '',
        fees: trade.fees || 0,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        screenshot: trade.screenshot,
        status: trade.status,
        user_id: user?.id || ''
      }))

      await db.importData(JSON.stringify({ trades: processedTrades }))
      setSuccess('Data imported successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import data')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Settings
          </h1>
        </div>

        {error && (
          <div className="bg-red-50/80 backdrop-blur-lg border border-red-200 rounded-xl p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50/80 backdrop-blur-lg border border-green-200 rounded-xl p-4">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        {/* Capital Management */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Capital Management</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="totalCapital" className="block text-sm font-medium text-gray-700">
                Total Available Capital
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="totalCapital"
                  id="totalCapital"
                  min="0"
                  step="0.01"
                  value={settings.totalCapital}
                  onChange={(e) => setSettings(prev => ({ ...prev, totalCapital: Number(e.target.value) }))}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label htmlFor="riskPerTrade" className="block text-sm font-medium text-gray-700">
                Risk Per Trade (%)
              </label>
              <div className="mt-2 relative rounded-md shadow-sm">
                <input
                  type="number"
                  name="riskPerTrade"
                  id="riskPerTrade"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.riskPerTrade}
                  onChange={(e) => setSettings(prev => ({ ...prev, riskPerTrade: Number(e.target.value) }))}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-lg"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>

        {/* Stock Purchase Reminders */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Stock Purchase Reminders</h2>
          <ReminderSettings />
        </div>

        {/* Trading Strategies */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Trading Strategies</h2>
          <form onSubmit={handleAddStrategy} className="space-y-4">
            <div className="flex gap-4">
              <input
                type="text"
                value={newStrategy}
                onChange={(e) => setNewStrategy(e.target.value)}
                placeholder="Enter new strategy"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Add Strategy
              </button>
            </div>
          </form>

          <div className="mt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Strategies</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {strategies.map((strategy) => (
                <div
                  key={strategy}
                  className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm border border-gray-200"
                >
                  <span className="text-sm font-medium text-gray-900">{strategy}</span>
                  <button
                    onClick={() => handleDeleteStrategy(strategy)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Management</h2>
          <div className="space-y-4">
            <div>
              <button
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                Export Data
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Import Data</label>
              <div className="mt-2">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  disabled={loading}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 