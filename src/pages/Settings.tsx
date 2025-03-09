import { useState, useEffect } from 'react'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

interface UserSettings {
  totalCapital: number
  riskPerTrade: number
}

function Settings() {
  const { user } = useAuth()
  const [strategies, setStrategies] = useState<string[]>([])
  const [newStrategy, setNewStrategy] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [settings, setSettings] = useState<UserSettings>({
    totalCapital: 0,
    riskPerTrade: 1
  })

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        // Load strategies
        const savedStrategies = await db.getStrategies()
        setStrategies(savedStrategies || [])

        // Load user settings
        const { data: userSettings, error } = await db.supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', user?.id)
          .single()

        if (!error && userSettings) {
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
    loadSettings()
  }, [user])

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedStrategy = newStrategy.trim()
    if (trimmedStrategy && !strategies.includes(trimmedStrategy)) {
      try {
        // Add a dummy trade with the new strategy to make it available
        await db.addTrade({
          symbol: 'AAPL',
          type: 'long',
          entry_date: new Date().toISOString(),
          exit_date: null,
          entry_price: 150,
          exit_price: null,
          quantity: 0,
          strategy: trimmedStrategy,
          notes: 'Test trade',
          fees: 0,
          stop_loss: null,
          take_profit: null,
          screenshot: null,
          status: 'open',
          user_id: user?.id || ''
        })
        
        // Refresh strategies
        const updatedStrategies = await db.getStrategies()
        setStrategies(updatedStrategies)
        setNewStrategy('')
      } catch (error) {
        console.error('Error adding strategy:', error)
        alert('Failed to add strategy. Please try again.')
      }
    }
  }

  const handleDeleteStrategy = async (strategy: string) => {
    try {
      // Delete all trades with this strategy
      const trades = await db.getAllTrades()
      const tradesToDelete = trades.filter(t => t.strategy === strategy)
      
      for (const trade of tradesToDelete) {
        await db.deleteTrade(trade.id)
      }

      // Refresh strategies
      const updatedStrategies = await db.getStrategies()
      setStrategies(updatedStrategies)
    } catch (error) {
      console.error('Error deleting strategy:', error)
      alert('Failed to delete strategy. Please try again.')
    }
  }

  const handleSaveSettings = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const { error } = await db.supabase
        .from('user_settings')
        .upsert({
          user_id: user?.id,
          total_capital: settings.totalCapital,
          risk_per_trade: settings.riskPerTrade,
          updated_at: new Date().toISOString()
        })

      if (error) throw error
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
              <div className="mt-2">
                <input
                  type="number"
                  name="riskPerTrade"
                  id="riskPerTrade"
                  min="0"
                  max="100"
                  step="0.1"
                  value={settings.riskPerTrade}
                  onChange={(e) => setSettings(prev => ({ ...prev, riskPerTrade: Number(e.target.value) }))}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-lg"
                />
              </div>
            </div>

            <div className="pt-4">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {loading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Trading Strategies */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Trading Strategies</h2>
          <div className="space-y-4">
            <form onSubmit={handleAddStrategy} className="flex gap-4">
              <input
                type="text"
                value={newStrategy}
                onChange={(e) => setNewStrategy(e.target.value)}
                placeholder="Enter strategy name"
                className="flex-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-lg"
              />
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                Add Strategy
              </button>
            </form>

            <div className="mt-4">
              <ul className="divide-y divide-gray-200">
                {strategies.map((strategy) => (
                  <li key={strategy} className="py-3 flex justify-between items-center">
                    <span className="text-gray-900">{strategy}</span>
                    <button
                      onClick={() => handleDeleteStrategy(strategy)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Data Management</h2>
          <div className="space-y-4">
            <div className="flex gap-4">
              <button
                onClick={handleExport}
                disabled={loading}
                className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
              >
                {loading ? 'Exporting...' : 'Export Data'}
              </button>
              <label className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 cursor-pointer">
                <span>{loading ? 'Importing...' : 'Import Data'}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                  disabled={loading}
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 