import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../services/supabase'
import type { Trade } from '../services/supabase'

function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadTrades()
  }, [])

  const loadTrades = async () => {
    try {
      const data = await db.getAllTrades()
      setTrades(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return

    try {
      await db.deleteTrade(id)
      setTrades(trades.filter(trade => trade.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade')
    }
  }

  const calculateProfitLoss = (trade: Trade) => {
    if (!trade.exit_price) return 0
    const profitLoss = trade.type === 'long'
      ? (trade.exit_price - trade.entry_price) * trade.position_size
      : (trade.entry_price - trade.exit_price) * trade.position_size
    return profitLoss - (trade.fees || 0)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Recent Trades</h2>
        <Link
          to="/trade/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          New Trade
        </Link>
      </div>

      {trades.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No trades yet. Start by adding your first trade!</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {trades.map((trade) => {
              const profitLoss = calculateProfitLoss(trade)
              return (
                <li key={trade.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-primary-600 truncate">
                          {trade.symbol}
                        </p>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              profitLoss >= 0
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {profitLoss >= 0 ? '+' : ''}
                            {profitLoss.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                      <div className="ml-2 flex-shrink-0 flex">
                        <Link
                          to={`/trade/${trade.id}`}
                          className="text-primary-600 hover:text-primary-900 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDelete(trade.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Entry: {new Date(trade.entry_date).toLocaleDateString()}
                        </p>
                        {trade.exit_date && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            Exit: {new Date(trade.exit_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>Strategy: {trade.strategy}</p>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Dashboard 