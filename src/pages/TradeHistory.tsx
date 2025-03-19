import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import type { Trade, UserSettings } from '../services/supabase'

interface FilterState {
  dateRange: string
  customStartDate: string | null
  customEndDate: string | null
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
  const [assets, setAssets] = useState<string[]>([])
  const [strategies, setStrategies] = useState<string[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    customStartDate: null,
    customEndDate: null,
    asset: 'all',
    strategy: 'all',
    status: 'all',
    profitRange: 'all'
  })
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Trade | 'profit_loss';
    direction: 'asc' | 'desc';
  }>({ key: 'entry_date', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const [tradesPerPage] = useState(10)
  const [selectedTrades, setSelectedTrades] = useState<string[]>([])
  const navigate = useNavigate()

  useEffect(() => {
    loadTrades()
    loadUserSettings()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [trades, filters])

  const loadTrades = async () => {
    try {
      setLoading(true)
      const data = await db.getAllTrades()
      console.log('Loaded trades:', data)
      setTrades(data)
      
      // Extract unique assets and strategies
      const uniqueAssets = [...new Set(data.map(trade => trade.symbol))]
      const uniqueStrategies = [...new Set(data.map(trade => trade.strategy))]
      
      setAssets(uniqueAssets)
      setStrategies(uniqueStrategies)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  const loadUserSettings = async () => {
    try {
      const { data: { session } } = await db.supabase.auth.getSession()
      if (session?.user) {
        const settings = await db.getUserSettings(session.user.id)
        setUserSettings(settings)
      }
    } catch (err) {
      console.error('Error loading user settings:', err)
    }
  }

  const calculateProfitLoss = (trade: Trade): number => {
    if (!trade.entry_price) return 0;
    
    // For old trades with exit_price
    if (trade.exit_price !== null && trade.exit_price !== undefined) {
      return trade.type === 'long'
        ? (trade.exit_price - trade.entry_price) * trade.quantity
        : (trade.entry_price - trade.exit_price) * trade.quantity;
    }
    
    // For new trades with exits array
    if (trade.exits && trade.exits.length > 0) {
      return trade.exits.reduce((total, exit) => {
        const exitPL = trade.type === 'long'
          ? (exit.exit_price - trade.entry_price!) * exit.quantity
          : (trade.entry_price! - exit.exit_price) * exit.quantity;
        return total + exitPL;
      }, 0);
    }
    
    return 0;
  }

  const calculatePositionSize = (trade: Trade): number => {
    if (!trade.entry_price || !userSettings?.total_capital) return 0;
    const totalValue = trade.entry_price * trade.quantity;
    return (totalValue / userSettings.total_capital) * 100;
  }

  const calculateTotalValue = (trade: Trade): number => {
    if (!trade.entry_price || !trade.quantity) return 0;
    return trade.entry_price * trade.quantity;
  }

  const calculateProfitLossPercentage = (trade: Trade): number => {
    if (!trade.entry_price) return 0;
    
    // For old trades with exit_price
    if (trade.exit_price !== null && trade.exit_price !== undefined) {
      return ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100;
    }
    
    // For new trades with exits array
    if (trade.exits && trade.exits.length > 0) {
      const totalExitValue = trade.exits.reduce((total, exit) => total + (exit.exit_price * exit.quantity), 0);
      const totalExitQuantity = trade.exits.reduce((total, exit) => total + exit.quantity, 0);
      const averageExitPrice = totalExitValue / totalExitQuantity;
      
      return ((averageExitPrice - trade.entry_price) / trade.entry_price) * 100;
    }
    
    return 0;
  }

  const calculateRiskRewardRatio = (trade: Trade): number | null => {
    // For old trades, use exit_price and entry_price if stop_loss or take_profit is missing
    if (trade.exit_price !== null && trade.exit_price !== undefined && trade.entry_price) {
      const actualReward = Math.abs(trade.exit_price - trade.entry_price);
      
      // If stop_loss is missing, estimate risk as 1/2 of the reward (conservative estimate)
      const risk = trade.stop_loss 
        ? Math.abs(trade.entry_price - trade.stop_loss)
        : actualReward / 2;
      
      return risk > 0 ? actualReward / risk : null;
    }
    
    // For new trades with exits
    if (trade.exits && trade.exits.length > 0 && trade.entry_price) {
      const exitPrices = trade.exits.map(exit => exit.exit_price);
      const bestExitPrice = trade.type === 'long' 
        ? Math.max(...exitPrices)
        : Math.min(...exitPrices);
      
      const actualReward = Math.abs(bestExitPrice - trade.entry_price);
      
      // If stop_loss is missing, estimate risk as 1/2 of the reward (conservative estimate)
      const risk = trade.stop_loss 
        ? Math.abs(trade.entry_price - trade.stop_loss)
        : actualReward / 2;
      
      return risk > 0 ? actualReward / risk : null;
    }
    
    // For open trades with take_profit target
    if (trade.entry_price && trade.take_profit) {
      const potentialReward = Math.abs(trade.take_profit - trade.entry_price);
      
      // If stop_loss is missing, estimate risk as 1/2 of the potential reward
      const risk = trade.stop_loss 
        ? Math.abs(trade.entry_price - trade.stop_loss)
        : potentialReward / 2;
      
      return risk > 0 ? potentialReward / risk : null;
    }
    
    return null;
  }

  const calculateRiskPerTrade = (trade: Trade): number => {
    if (!trade.entry_price || !trade.stop_loss || !userSettings?.total_capital) return 0;
    const riskAmount = Math.abs(trade.entry_price - trade.stop_loss) * trade.quantity;
    return (riskAmount / userSettings.total_capital) * 100;
  }

  const calculateTotalExposure = (trades: Trade[]): number => {
    if (!userSettings?.total_capital) return 0;
    
    const openTrades = trades.filter(trade => trade.status === 'open');
    const totalExposure = openTrades.reduce((total, trade) => {
      if (!trade.entry_price || !trade.quantity) return total;
      const remainingQuantity = trade.remaining_quantity ?? trade.quantity;
      return total + (trade.entry_price * remainingQuantity);
    }, 0);
    
    return (totalExposure / userSettings.total_capital) * 100;
  }

  const calculateStopLossEffectiveness = (trades: Trade[]): {
    totalStopLosses: number;
    hitRate: number;
    averageLoss: number;
  } => {
    const closedTrades = trades.filter(trade => 
      trade.status === 'closed' && 
      trade.stop_loss !== null && 
      trade.stop_loss !== undefined
    );
    
    const stoppedOutTrades = closedTrades.filter(trade => {
      if (!trade.stop_loss) return false;
      const exitPrice = trade.exit_price || 0;
      return trade.type === 'long' 
        ? exitPrice <= trade.stop_loss
        : exitPrice >= trade.stop_loss;
    });

    const totalStopLosses = stoppedOutTrades.length;
    const hitRate = closedTrades.length > 0 
      ? (totalStopLosses / closedTrades.length) * 100 
      : 0;

    const averageLoss = stoppedOutTrades.length > 0
      ? stoppedOutTrades.reduce((sum, trade) => sum + calculateProfitLoss(trade), 0) / stoppedOutTrades.length
      : 0;

    return {
      totalStopLosses,
      hitRate,
      averageLoss
    };
  }

  const applyFilters = () => {
    let filtered = [...trades]

    // Date range filter
    if (filters.dateRange === 'custom' && filters.customStartDate && filters.customEndDate) {
      const startDate = new Date(filters.customStartDate)
      const endDate = new Date(filters.customEndDate)
      filtered = filtered.filter(trade => {
        const tradeDate = new Date(trade.entry_date)
        return tradeDate >= startDate && tradeDate <= endDate
      })
    } else if (filters.dateRange !== 'all') {
      const now = new Date()
      const startDate = new Date()
      
      switch (filters.dateRange) {
        case 'today':
          startDate.setHours(0, 0, 0, 0)
          break
        case 'week':
          startDate.setDate(now.getDate() - 7)
          break
        case 'month':
          startDate.setMonth(now.getMonth() - 1)
          break
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1)
          break
      }
      
      filtered = filtered.filter(trade => new Date(trade.entry_date) >= startDate)
    }

    // Asset filter
    if (filters.asset !== 'all') {
      filtered = filtered.filter(trade => trade.symbol === filters.asset)
    }

    // Strategy filter
    if (filters.strategy !== 'all') {
      filtered = filtered.filter(trade => trade.strategy === filters.strategy)
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(trade => trade.status === filters.status)
    }

    // Profit range filter
    if (filters.profitRange !== 'all') {
      filtered = filtered.filter(trade => {
        const pl = calculateProfitLoss(trade)
        switch (filters.profitRange) {
          case 'profit':
            return pl > 0
          case 'loss':
            return pl < 0
          default:
            return true
        }
      })
    }

    setFilteredTrades(filtered)
  }

  const handleFilterChange = (name: keyof FilterState, value: string) => {
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return

    try {
      await db.deleteTrade(id)
      setTrades(trades.filter(trade => trade.id !== id))
      setFilteredTrades(filteredTrades.filter(trade => trade.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade')
    }
  }

  const handleSort = (key: keyof Trade | 'profit_loss') => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const sortedTrades = useMemo(() => {
    const sorted = [...filteredTrades].sort((a, b) => {
      if (sortConfig.key === 'entry_date' || sortConfig.key === 'exit_date') {
        const dateA = new Date(a[sortConfig.key] || 0).getTime()
        const dateB = new Date(b[sortConfig.key] || 0).getTime()
        return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA
      }
      
      if (sortConfig.key === 'profit_loss') {
        const plA = calculateProfitLoss(a) || 0
        const plB = calculateProfitLoss(b) || 0
        return sortConfig.direction === 'asc' ? plA - plB : plB - plA
      }

      const valA = a[sortConfig.key]
      const valB = b[sortConfig.key]
      
      if (typeof valA === 'string' && typeof valB === 'string') {
        return sortConfig.direction === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA)
      }
      
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortConfig.direction === 'asc' ? valA - valB : valB - valA
      }
      
      return 0
    })
    return sorted
  }, [filteredTrades, sortConfig])

  const indexOfLastTrade = currentPage * tradesPerPage
  const indexOfFirstTrade = indexOfLastTrade - tradesPerPage
  const currentTrades = sortedTrades.slice(indexOfFirstTrade, indexOfLastTrade)
  const totalPages = Math.ceil(sortedTrades.length / tradesPerPage)

  const Pagination = () => (
    <div className="flex items-center justify-between px-4 py-3 bg-white/70 border-t border-gray-200 sm:px-6 rounded-b-2xl">
      <div className="flex justify-between flex-1 sm:hidden">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="relative inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Previous
        </button>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="relative ml-3 inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-gray-700">
            Showing <span className="font-medium">{indexOfFirstTrade + 1}</span> to{' '}
            <span className="font-medium">
              {Math.min(indexOfLastTrade, sortedTrades.length)}
            </span>{' '}
            of <span className="font-medium">{sortedTrades.length}</span> results
          </p>
        </div>
        <div>
          <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(number => (
              <button
                key={number}
                onClick={() => setCurrentPage(number)}
                className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                  currentPage === number
                    ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                    : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                }`}
              >
                {number}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </div>
  )

  const SortIndicator = ({ column }: { column: keyof Trade | 'profit_loss' }) => {
    if (sortConfig.key !== column) {
      return <span className="text-gray-400">↕</span>
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓'
  }

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedTrades.length} trades?`)) return

    try {
      await Promise.all(selectedTrades.map(id => db.deleteTrade(id)))
      setTrades(trades.filter(trade => !selectedTrades.includes(trade.id)))
      setFilteredTrades(filteredTrades.filter(trade => !selectedTrades.includes(trade.id)))
      setSelectedTrades([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trades')
    }
  }

  const handleExport = () => {
    const tradesToExport = selectedTrades.length > 0
      ? trades.filter(trade => selectedTrades.includes(trade.id))
      : trades

    const csvContent = [
      // CSV Headers
      ['Date', 'Symbol', 'Type', 'Entry Price', 'Exit Price', 'Quantity', 'P/L', 'P/L %', 'Status'].join(','),
      // CSV Data
      ...tradesToExport.map(trade => [
        new Date(trade.entry_date).toLocaleDateString(),
        trade.symbol,
        trade.type,
        trade.entry_price?.toFixed(2) || '',
        trade.exit_price?.toFixed(2) || '',
        trade.quantity,
        calculateProfitLoss(trade).toFixed(2),
        calculateProfitLossPercentage(trade).toFixed(2) + '%',
        trade.status
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `trade_history_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
          role="status"
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Trade History
          </h1>
          <Link
            to="/trade/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            + New Trade
          </Link>
        </div>

        {/* Filters */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Filters
          </h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <div className="space-y-2">
              <label htmlFor="dateRange" className="block text-sm font-medium text-gray-700">
                Date Range
              </label>
              <select
                id="dateRange"
                className="block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {filters.dateRange === 'custom' && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                      Start Date
                    </label>
                    <input
                      type="date"
                      id="startDate"
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={filters.customStartDate || ''}
                      onChange={(e) => handleFilterChange('customStartDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                      End Date
                    </label>
                    <input
                      type="date"
                      id="endDate"
                      className="mt-1 block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      value={filters.customEndDate || ''}
                      onChange={(e) => handleFilterChange('customEndDate', e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="asset" className="block text-sm font-medium text-gray-700">
                Asset
              </label>
              <select
                id="asset"
                className="block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                value={filters.asset}
                onChange={(e) => handleFilterChange('asset', e.target.value)}
              >
                <option value="all">All Assets</option>
                {assets.map(asset => (
                  <option key={asset} value={asset}>{asset}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
                Strategy
              </label>
              <select
                id="strategy"
                className="block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                value={filters.strategy}
                onChange={(e) => handleFilterChange('strategy', e.target.value)}
              >
                <option value="all">All Strategies</option>
                {strategies.map(strategy => (
                  <option key={strategy} value={strategy}>{strategy}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                className="block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="all">All Trades</option>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="profitRange" className="block text-sm font-medium text-gray-700">
                Profit Range
              </label>
              <select
                id="profitRange"
                className="block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
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

        {/* Risk Analysis Section */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Risk Analysis
          </h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {/* Total Market Exposure */}
            <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-4 border border-purple-100">
              <h3 className="text-sm font-medium text-gray-500">Total Market Exposure</h3>
              <p className="mt-2 text-2xl font-semibold text-gray-900">
                {calculateTotalExposure(trades).toFixed(2)}%
              </p>
              <p className="mt-1 text-sm text-gray-500">
                of total capital
              </p>
            </div>

            {/* Stop Loss Analysis */}
            <div className="bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl p-4 border border-rose-100">
              <h3 className="text-sm font-medium text-gray-500">Stop Loss Effectiveness</h3>
              {(() => {
                const slAnalysis = calculateStopLossEffectiveness(trades);
                return (
                  <>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {slAnalysis.hitRate.toFixed(1)}%
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      Hit rate ({slAnalysis.totalStopLosses} stops)
                    </p>
                    <p className="mt-1 text-sm text-red-600">
                      Avg. Loss: ${Math.abs(slAnalysis.averageLoss).toFixed(2)}
                    </p>
                  </>
                );
              })()}
            </div>

            {/* Average Risk per Trade */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-100">
              <h3 className="text-sm font-medium text-gray-500">Average Risk per Trade</h3>
              {(() => {
                const avgRisk = trades
                  .map(trade => calculateRiskPerTrade(trade))
                  .reduce((sum, risk) => sum + risk, 0) / trades.length || 0;
                return (
                  <>
                    <p className="mt-2 text-2xl font-semibold text-gray-900">
                      {avgRisk.toFixed(2)}%
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      of total capital per trade
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>

        {/* Trade Table */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                {selectedTrades.length} selected
              </span>
              {selectedTrades.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="text-red-600 hover:text-red-900 text-sm font-medium"
                >
                  Delete Selected
                </button>
              )}
            </div>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Export to CSV
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedTrades.length === currentTrades.length}
                      onChange={(e) => {
                        setSelectedTrades(
                          e.target.checked
                            ? currentTrades.map(t => t.id)
                            : []
                        )
                      }}
                    />
                  </th>
                  <th
                    onClick={() => handleSort('entry_date')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-indigo-100/50"
                  >
                    Date <SortIndicator column="entry_date" />
                  </th>
                  <th
                    onClick={() => handleSort('symbol')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-indigo-100/50"
                  >
                    Symbol <SortIndicator column="symbol" />
                  </th>
                  <th
                    onClick={() => handleSort('type')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-indigo-100/50"
                  >
                    Type <SortIndicator column="type" />
                  </th>
                  <th
                    onClick={() => handleSort('entry_price')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-indigo-100/50"
                  >
                    Entry Price <SortIndicator column="entry_price" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Total Value
                  </th>
                  <th
                    onClick={() => handleSort('exit_price')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-indigo-100/50"
                  >
                    Exit Price <SortIndicator column="exit_price" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Position Size
                  </th>
                  <th
                    onClick={() => handleSort('profit_loss')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-indigo-100/50"
                  >
                    P/L <SortIndicator column="profit_loss" />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    P/L %
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    R:R Ratio
                  </th>
                  <th
                    onClick={() => handleSort('status')}
                    className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-indigo-100/50"
                  >
                    Status <SortIndicator column="status" />
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider w-[150px]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200/50">
                {currentTrades.map((trade) => {
                  const profitLoss = calculateProfitLoss(trade)
                  const positionSize = calculatePositionSize(trade)
                  const totalValue = calculateTotalValue(trade)
                  const profitLossPercentage = calculateProfitLossPercentage(trade)
                  const riskRewardRatio = calculateRiskRewardRatio(trade)
                  const currentQuantity = trade.remaining_quantity ?? trade.quantity
                  
                  return (
                    <tr 
                      key={trade.id} 
                      className="hover:bg-indigo-50/50 transition-colors duration-200 cursor-pointer backdrop-blur-lg group" 
                      onClick={() => navigate(`/trade/${trade.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                          checked={selectedTrades.includes(trade.id)}
                          onChange={(e) => {
                            setSelectedTrades(prev =>
                              e.target.checked
                                ? [...prev, trade.id]
                                : prev.filter(id => id !== trade.id)
                            )
                          }}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {new Date(trade.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {trade.symbol}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          trade.type === 'long' 
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800' 
                            : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800'
                        }`}>
                          {trade.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${trade.entry_price?.toFixed(2) || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.status === 'closed' ? (
                          trade.quantity
                        ) : (
                          <>
                            {currentQuantity}
                            {trade.remaining_quantity !== undefined && trade.remaining_quantity !== trade.quantity && (
                              <span className="text-gray-500 text-xs ml-1">
                                (of {trade.quantity})
                              </span>
                            )}
                          </>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${totalValue > 0 ? totalValue.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {trade.exit_price ? (
                          `$${trade.exit_price.toFixed(2)}`
                        ) : trade.exits && trade.exits.length > 0 ? (
                          <div className="space-y-1">
                            {trade.exits.map((exit, index) => (
                              <div key={exit.id || index} className="text-xs">
                                ${exit.exit_price.toFixed(2)} ({exit.quantity} shares)
                              </div>
                            ))}
                          </div>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {positionSize.toFixed(2)}%
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`${
                          profitLoss > 0 
                            ? 'text-green-600' 
                            : profitLoss < 0 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                        }`}>
                          ${profitLoss.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={`${
                          profitLossPercentage > 0 
                            ? 'text-green-600' 
                            : profitLossPercentage < 0 
                              ? 'text-red-600' 
                              : 'text-gray-500'
                        }`}>
                          {profitLossPercentage.toFixed(2)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {(() => {
                          const ratio = riskRewardRatio;
                          return ratio !== null ? (
                            <span className="text-blue-600 font-medium">
                              1:{parseFloat(ratio.toFixed(2))}
                            </span>
                          ) : (
                            <span className="text-gray-400">-</span>
                          );
                        })()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          trade.status === 'open' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Link
                            to={`/trade/${trade.id}`}
                            className="text-indigo-600 hover:text-indigo-900 px-4 py-2 rounded-lg hover:bg-indigo-50/50 transition-all duration-200"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Edit
                          </Link>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(trade.id);
                            }}
                            className="text-red-600 hover:text-red-900 px-4 py-2 rounded-lg hover:bg-red-50/50 transition-all duration-200"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <Pagination />
        </div>
      </div>
    </div>
  )
}

export default TradeHistory 