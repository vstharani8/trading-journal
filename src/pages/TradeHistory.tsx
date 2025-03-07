import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { db } from '../services/supabase'
import type { Trade } from '../services/supabase'
import { format } from 'date-fns'

interface FilterState {
  dateRange: string
  asset: string
  strategy: string
  status: string
  profitRange: string
}

function TradeHistory() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<string[]>([])
  const [assets, setAssets] = useState<string[]>([])
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    asset: 'all',
    strategy: 'all',
    status: 'all',
    profitRange: 'all'
  })

  useEffect(() => {
    loadTrades()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [filters, trades])

  const loadTrades = async () => {
    try {
      const data = await db.getAllTrades()
      setTrades(data)
      
      // Extract unique assets and strategies
      const uniqueAssets = Array.from(new Set(data.map(t => t.symbol)))
      const uniqueStrategies = Array.from(new Set(data.map(t => t.strategy).filter(Boolean) as string[]))
      
      setAssets(uniqueAssets)
      setStrategies(uniqueStrategies)
      setFilteredTrades(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  const calculateProfitLoss = (trade: Trade) => {
    if (!trade.exit_price) return 0
    const profitLoss = trade.type === 'long'
      ? (trade.exit_price - trade.entry_price) * trade.position_size
      : (trade.entry_price - trade.exit_price) * trade.position_size
    return profitLoss - (trade.fees || 0)
  }

  const applyFilters = () => {
    let filtered = [...trades]

    // Date Range Filter
    if (filters.dateRange !== 'all') {
      const now = new Date()
      const days = filters.dateRange === 'week' ? 7 : filters.dateRange === 'month' ? 30 : 365
      const cutoff = new Date(now.setDate(now.getDate() - days))
      filtered = filtered.filter(trade => new Date(trade.entry_date) >= cutoff)
    }

    // Asset Filter
    if (filters.asset !== 'all') {
      filtered = filtered.filter(trade => trade.symbol === filters.asset)
    }

    // Strategy Filter
    if (filters.strategy !== 'all') {
      filtered = filtered.filter(trade => trade.strategy === filters.strategy)
    }

    // Status Filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(trade => trade.status === filters.status)
    }

    // Profit Range Filter
    if (filters.profitRange !== 'all') {
      filtered = filtered.filter(trade => {
        const pl = calculateProfitLoss(trade)
        switch (filters.profitRange) {
          case 'profit': return pl > 0
          case 'loss': return pl < 0
          default: return true
        }
      })
    }

    setFilteredTrades(filtered)
  }

  const handleFilterChange = (name: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const formatDateTime = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy HH:mm')
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
        <h1 className="text-2xl font-semibold text-gray-900">Trade History</h1>
        <Link
          to="/trade/new"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          New Trade
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">Date Range</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="year">Last Year</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Asset</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={filters.asset}
              onChange={(e) => handleFilterChange('asset', e.target.value)}
            >
              <option value="all">All Assets</option>
              {assets.map(asset => (
                <option key={asset} value={asset}>{asset}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Strategy</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={filters.strategy}
              onChange={(e) => handleFilterChange('strategy', e.target.value)}
            >
              <option value="all">All Strategies</option>
              {strategies.map(strategy => (
                <option key={strategy} value={strategy}>{strategy}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="all">All Trades</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Profit Range</label>
            <select
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              value={filters.profitRange}
              onChange={(e) => handleFilterChange('profitRange', e.target.value)}
            >
              <option value="all">All Trades</option>
              <option value="profit">Profitable</option>
              <option value="loss">Loss</option>
            </select>
          </div>
        </div>
      </div>

      {/* Trade Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Entry Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Entry</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Exit</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">P/L</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredTrades.map((trade) => {
              const profitLoss = calculateProfitLoss(trade)
              return (
                <tr key={trade.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDateTime(trade.entry_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {trade.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      trade.type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    ${trade.entry_price.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                    {trade.exit_price ? `$${trade.exit_price.toFixed(2)}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span className={profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link
                      to={`/trade/${trade.id}`}
                      className="text-primary-600 hover:text-primary-900 mr-4"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to delete this trade?')) {
                          db.deleteTrade(trade.id).then(() => {
                            setTrades(trades.filter(t => t.id !== trade.id))
                          })
                        }
                      }}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default TradeHistory 