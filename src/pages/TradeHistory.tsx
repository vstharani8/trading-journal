import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import type { Trade, UserSettings } from '../services/supabase'

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
  const [assets, setAssets] = useState<string[]>([])
  const [strategies, setStrategies] = useState<string[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    asset: 'all',
    strategy: 'all',
    status: 'all',
    profitRange: 'all'
  })
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
    if (!trade.exit_price || !trade.entry_price) return 0
    return trade.type === 'long'
      ? (trade.exit_price - trade.entry_price) * trade.quantity
      : (trade.entry_price - trade.exit_price) * trade.quantity
  }

  const calculatePositionSize = (trade: Trade): number => {
    if (!trade.entry_price || !userSettings?.total_capital) return 0
    return (trade.entry_price * trade.quantity) / userSettings.total_capital * 100
  }

  const calculateTotalValue = (trade: Trade): number => {
    if (!trade.entry_price || !trade.quantity) return 0
    return trade.entry_price * trade.quantity
  }

  const calculateProfitLossPercentage = (trade: Trade): number => {
    if (!trade.exit_price || !trade.entry_price) return 0
    return ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
  }

  const calculateRiskRewardRatio = (trade: Trade): number | null => {
    // For long positions
    if (trade.type === 'long') {
      if (!trade.entry_price || !trade.stop_loss) return null;
      const risk = trade.entry_price - trade.stop_loss;
      const reward = trade.exit_price 
        ? trade.exit_price - trade.entry_price 
        : (trade.take_profit ? trade.take_profit - trade.entry_price : 0);
      
      return risk > 0 ? reward / risk : null;
    }
    // For short positions
    else {
      if (!trade.entry_price || !trade.stop_loss) return null;
      const risk = trade.stop_loss - trade.entry_price;
      const reward = trade.exit_price 
        ? trade.entry_price - trade.exit_price 
        : (trade.take_profit ? trade.entry_price - trade.take_profit : 0);
      
      return risk > 0 ? reward / risk : null;
    }
  }

  const calculateRiskPerTrade = (trade: Trade): number => {
    if (!trade.entry_price || !trade.stop_loss || !userSettings?.total_capital) return 0;
    const riskAmount = Math.abs(trade.entry_price - trade.stop_loss) * trade.quantity;
    return (riskAmount / userSettings.total_capital) * 100;
  }

  const calculateTotalExposure = (trades: Trade[]): number => {
    if (!userSettings?.total_capital) return 0;
    const openTrades = trades.filter(trade => trade.status === 'open');
    const totalExposure = openTrades.reduce((sum, trade) => {
      return sum + ((trade.entry_price || 0) * trade.quantity);
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

  const getPositionSizeRecommendation = (trade: Trade): {
    recommended: number;
    maxSize: number;
    warning?: string;
  } => {
    if (!userSettings?.total_capital || !trade.entry_price || !trade.stop_loss) {
      return { recommended: 0, maxSize: 0, warning: 'Missing required data for calculation' };
    }

    const riskPercentage = 2; // Default 2% risk per trade
    const maxRiskPercentage = 5; // Maximum 5% risk per trade

    const priceDistance = Math.abs(trade.entry_price - trade.stop_loss);
    const maxLoss = (userSettings.total_capital * (riskPercentage / 100));
    const recommendedShares = Math.floor(maxLoss / priceDistance);
    
    const maxLossAtMaxRisk = (userSettings.total_capital * (maxRiskPercentage / 100));
    const maxShares = Math.floor(maxLossAtMaxRisk / priceDistance);

    const currentRisk = calculateRiskPerTrade(trade);
    let warning;
    if (currentRisk > maxRiskPercentage) {
      warning = `Current position exceeds maximum recommended risk of ${maxRiskPercentage}%`;
    } else if (currentRisk > riskPercentage) {
      warning = `Current position exceeds standard risk parameter of ${riskPercentage}%`;
    }

    return {
      recommended: recommendedShares,
      maxSize: maxShares,
      warning
    };
  }

  const applyFilters = () => {
    let filtered = [...trades]

    // Date range filter
    if (filters.dateRange !== 'all') {
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"
          role="status"
          aria-label="Loading trades"
        >
          <span className="sr-only">Loading trades...</span>
        </div>
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
                <option value="week">Last Week</option>
                <option value="month">Last Month</option>
                <option value="year">Last Year</option>
              </select>
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

            {/* Position Size Recommendations */}
            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
              <h3 className="text-sm font-medium text-gray-500">Position Sizing</h3>
              <div className="mt-2">
                {trades.filter(t => t.status === 'open').map(trade => {
                  const recommendation = getPositionSizeRecommendation(trade);
                  return (
                    <div key={trade.id} className="mb-2">
                      <p className="text-sm font-medium">{trade.symbol}</p>
                      {recommendation.warning && (
                        <p className="text-xs text-red-600">{recommendation.warning}</p>
                      )}
                      <p className="text-xs text-gray-500">
                        Recommended: {recommendation.recommended} shares
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Trade Table */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200/50">
              <thead>
                <tr className="bg-gradient-to-r from-indigo-50 to-purple-50">
                  {[
                    'Date', 'Symbol', 'Type', 'Entry Price', 'Quantity', 'Total Value',
                    'Exit Price', 'Position Size', 'P/L', 'P/L %', 'R:R Ratio', 'Status', 'Actions'
                  ].map((header) => (
                    <th
                      key={header}
                      scope="col"
                      className={`px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${
                        header === 'Actions' ? 'text-right w-[150px]' : ''
                      }`}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white/50 divide-y divide-gray-200/50">
                {filteredTrades.map((trade) => {
                  const profitLoss = calculateProfitLoss(trade)
                  const positionSize = calculatePositionSize(trade)
                  const totalValue = calculateTotalValue(trade)
                  const profitLossPercentage = calculateProfitLossPercentage(trade)
                  const riskRewardRatio = calculateRiskRewardRatio(trade)
                  
                  return (
                    <tr 
                      key={trade.id} 
                      className="hover:bg-indigo-50/50 transition-colors duration-200 cursor-pointer backdrop-blur-lg" 
                      onClick={() => navigate(`/trade/${trade.id}`)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {new Date(trade.entry_date).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
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
                        {trade.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${totalValue > 0 ? totalValue.toFixed(2) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${trade.exit_price?.toFixed(2) || '-'}
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
                        <div className="flex justify-end gap-4">
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
        </div>
      </div>
    </div>
  )
}

export default TradeHistory 