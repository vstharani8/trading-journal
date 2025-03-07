import { useState, useEffect } from 'react'
import { db } from '../services/supabase'

function Settings() {
  const [strategies, setStrategies] = useState<string[]>([])
  const [newStrategy, setNewStrategy] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true)
        const savedStrategies = await db.getStrategies()
        setStrategies(savedStrategies || [])
      } catch (error) {
        console.error('Error loading settings:', error)
      } finally {
        setIsLoading(false)
      }
    }
    loadSettings()
  }, [])

  const handleAddStrategy = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedStrategy = newStrategy.trim()
    if (trimmedStrategy && !strategies.includes(trimmedStrategy)) {
      try {
        const updatedStrategies = [...strategies, trimmedStrategy]
        await db.setStrategies(updatedStrategies)
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
      const updatedStrategies = strategies.filter((s) => s !== strategy)
      await db.setStrategies(updatedStrategies)
      setStrategies(updatedStrategies)
    } catch (error) {
      console.error('Error deleting strategy:', error)
      alert('Failed to delete strategy. Please try again.')
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

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const data = event.target?.result as string
          await db.importData(data)
          setSuccess('Data imported successfully')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to import data')
        } finally {
          setLoading(false)
        }
      }
      reader.readAsText(file)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read file')
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

      {/* Trading Strategies */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Trading Strategies</h2>
        <form onSubmit={handleAddStrategy} className="flex gap-2 mb-4">
          <input
            type="text"
            value={newStrategy}
            onChange={(e) => setNewStrategy(e.target.value)}
            placeholder="Enter new strategy"
            className="input flex-1"
            required
            minLength={1}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
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
      <div className="card">
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

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Clear All Data</h3>
            <p className="text-sm text-gray-500 mb-2">
              Warning: This will permanently delete all your trading data and settings.
            </p>
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                  await db.importData('{"trades":[],"strategies":[]}')
                  window.location.reload()
                }
              }}
              className="btn btn-danger"
            >
              Clear All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings 