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
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-6">
          <p className="text-green-600">{success}</p>
        </div>
      )}

      {/* Capital Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Capital Management</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="totalCapital" className="block text-sm font-medium text-gray-700">
              Total Available Capital
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
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
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pl-7 pr-12 sm:text-sm border-gray-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label htmlFor="riskPerTrade" className="block text-sm font-medium text-gray-700">
              Risk Per Trade (%)
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <input
                type="number"
                name="riskPerTrade"
                id="riskPerTrade"
                min="0.1"
                max="100"
                step="0.1"
                value={settings.riskPerTrade}
                onChange={(e) => setSettings(prev => ({ ...prev, riskPerTrade: Number(e.target.value) }))}
                className="focus:ring-primary-500 focus:border-primary-500 block w-full pr-12 sm:text-sm border-gray-300 rounded-md"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">%</span>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Maximum risk amount: ${((settings.totalCapital * settings.riskPerTrade) / 100).toFixed(2)}
            </p>
          </div>

          <div className="pt-4">
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Trading Strategies */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Trading Strategies</h2>
        <form onSubmit={handleAddStrategy} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newStrategy}
            onChange={(e) => setNewStrategy(e.target.value)}
            placeholder="Enter new strategy"
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            required
            minLength={1}
          />
          <button 
            type="submit" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            disabled={!newStrategy.trim()}
          >
            Add Strategy
          </button>
        </form>
        <div className="space-y-2">
          {strategies.length === 0 ? (
            <p className="text-sm text-gray-500">No strategies added yet.</p>
          ) : (
            strategies.map((strategy) => (
              <div
                key={strategy}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <span className="text-sm text-gray-900">{strategy}</span>
                <button
                  onClick={() => handleDeleteStrategy(strategy)}
                  className="text-red-600 hover:text-red-900"
                >
                  Delete
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Data Management</h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Export Data</h3>
            <button
              onClick={handleExport}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Exporting...' : 'Export Data'}
            </button>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Import Data</h3>
            <p className="text-sm text-gray-500 mb-2">
              Import your trading data from a previously exported JSON file. This will replace all existing data.
            </p>
            <div className="flex items-center space-x-4">
              <label
                htmlFor="import-file"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 cursor-pointer"
              >
                {loading ? 'Importing...' : 'Select File'}
              </label>
              <input
                type="file"
                id="import-file"
                accept=".json"
                onChange={handleImport}
                disabled={loading}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 