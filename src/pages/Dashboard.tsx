import { useEffect, useState } from 'react'
import { db } from '../services/supabase'
import type { Trade } from '../services/supabase'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns'

interface Statistics {
  totalProfitLoss: number
  winRate: number
  avgRiskRewardRatio: number
  maxDrawdown: number
  bestTrade: {
    symbol: string
    profitPercentage: number
  } | null
  worstTrade: {
    symbol: string
    lossPercentage: number
  } | null
}

interface MonthlyData {
  month: string
  profitLoss: number
  winRate: number
}

function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<Statistics>({
    totalProfitLoss: 0,
    winRate: 0,
    avgRiskRewardRatio: 0,
    maxDrawdown: 0,
    bestTrade: null,
    worstTrade: null
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

  useEffect(() => {
    loadTrades()
  }, [])

  const loadTrades = async () => {
    try {
      const data = await db.getAllTrades()
      calculateStatistics(data)
      calculateMonthlyData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  const calculateProfitLoss = (trade: Trade): number => {
    if (!trade.exit_price || !trade.entry_price) return 0
    return trade.type === 'long'
      ? (trade.exit_price - trade.entry_price) * trade.quantity
      : (trade.entry_price - trade.exit_price) * trade.quantity
  }

  const calculateTotalProfitLoss = (trades: Trade[]): number => {
    return trades.reduce((total, trade) => total + calculateProfitLoss(trade), 0)
  }

  const calculateWinRate = (trades: Trade[]): number => {
    const closedTrades = trades.filter(trade => trade.status === 'closed')
    if (closedTrades.length === 0) return 0
    const winningTrades = closedTrades.filter(trade => calculateProfitLoss(trade) > 0)
    return (winningTrades.length / closedTrades.length) * 100
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

  const calculateAverageRiskRewardRatio = (trades: Trade[]): number => {
    const ratios = trades
      .map(trade => calculateRiskRewardRatio(trade))
      .filter((ratio): ratio is number => ratio !== null);
    
    if (ratios.length === 0) return 0;
    const sum = ratios.reduce((acc, ratio) => acc + ratio, 0);
    return sum / ratios.length;
  }

  const calculateMaxDrawdown = (trades: Trade[]): number => {
    let peak = 0
    let maxDrawdown = 0
    let runningTotal = 0

    trades.forEach(trade => {
      runningTotal += calculateProfitLoss(trade)
      if (runningTotal > peak) {
        peak = runningTotal
      }
      const drawdown = peak - runningTotal
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    return maxDrawdown
  }

  const calculateProfitLossPercentage = (trade: Trade): number => {
    if (!trade.exit_price || !trade.entry_price) return 0;
    return ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100;
  }

  const findBestAndWorstTrades = (trades: Trade[]): { bestTrade: Statistics['bestTrade'], worstTrade: Statistics['worstTrade'] } => {
    const closedTrades = trades.filter(t => t.status === 'closed' && t.exit_price && t.entry_price);
    if (closedTrades.length === 0) return { bestTrade: null, worstTrade: null };

    const tradesWithPerformance = closedTrades.map(trade => ({
      symbol: trade.symbol,
      percentage: calculateProfitLossPercentage(trade)
    }));

    const bestTrade = tradesWithPerformance.reduce((best, current) => 
      current.percentage > (best?.percentage || -Infinity) ? current : best
    , null as { symbol: string, percentage: number } | null);

    const worstTrade = tradesWithPerformance.reduce((worst, current) => 
      current.percentage < (worst?.percentage || Infinity) ? current : worst
    , null as { symbol: string, percentage: number } | null);

    return {
      bestTrade: bestTrade ? {
        symbol: bestTrade.symbol,
        profitPercentage: bestTrade.percentage
      } : null,
      worstTrade: worstTrade ? {
        symbol: worstTrade.symbol,
        lossPercentage: worstTrade.percentage
      } : null
    };
  }

  const calculateStatistics = (trades: Trade[]) => {
    const closedTrades = trades.filter(t => t.status === 'closed')
    if (closedTrades.length === 0) return

    const totalProfitLoss = calculateTotalProfitLoss(trades)
    const winRate = calculateWinRate(trades)
    const avgRiskRewardRatio = calculateAverageRiskRewardRatio(trades)
    const maxDrawdown = calculateMaxDrawdown(trades)
    const { bestTrade, worstTrade } = findBestAndWorstTrades(trades)

    setStatistics({
      totalProfitLoss,
      winRate,
      avgRiskRewardRatio,
      maxDrawdown,
      bestTrade,
      worstTrade
    })
  }

  const calculateMonthlyData = (trades: Trade[]) => {
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    })

    const monthlyStats = last6Months.map(month => {
      const monthTrades = trades.filter(trade => {
        if (!trade.exit_date) return false
        const tradeDate = parseISO(trade.exit_date)
        return isWithinInterval(tradeDate, {
          start: startOfMonth(month),
          end: endOfMonth(month)
        })
      })

      const profitLoss = monthTrades.reduce((sum, trade) => sum + calculateProfitLoss(trade), 0)
      const closedTrades = monthTrades.filter(t => t.status === 'closed')
      const winRate = closedTrades.length > 0
        ? (closedTrades.filter(t => calculateProfitLoss(t) > 0).length / closedTrades.length) * 100
        : 0

      return {
        month: format(month, 'MMM yyyy'),
        profitLoss,
        winRate
      }
    })

    setMonthlyData(monthlyStats)
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
      <h1 className="text-2xl font-semibold text-gray-900">Trading Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Total Profit/Loss</h3>
          <p className={`mt-2 text-2xl font-semibold ${
            statistics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ${statistics.totalProfitLoss.toFixed(2)}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {statistics.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Avg R:R Ratio</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            1:{parseFloat(statistics.avgRiskRewardRatio.toFixed(2))}
          </p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Max Drawdown</h3>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            ${statistics.maxDrawdown.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Monthly Performance</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="profitLoss"
                stroke="#8884d8"
                name="Profit/Loss"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="winRate"
                stroke="#82ca9d"
                name="Win Rate (%)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Best and Worst Trades */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Best Trade</h3>
          {statistics.bestTrade ? (
            <div className="mt-2">
              <p className="text-2xl font-semibold text-green-600">
                {statistics.bestTrade.symbol}
              </p>
              <p className="text-lg text-green-600">
                +{parseFloat(statistics.bestTrade.profitPercentage.toFixed(2))}%
              </p>
            </div>
          ) : (
            <p className="mt-2 text-gray-500">No closed trades</p>
          )}
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium text-gray-500">Worst Trade</h3>
          {statistics.worstTrade ? (
            <div className="mt-2">
              <p className="text-2xl font-semibold text-red-600">
                {statistics.worstTrade.symbol}
              </p>
              <p className="text-lg text-red-600">
                {parseFloat(statistics.worstTrade.lossPercentage.toFixed(2))}%
              </p>
            </div>
          ) : (
            <p className="mt-2 text-gray-500">No closed trades</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard 