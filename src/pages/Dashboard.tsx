import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
  profitFactor: number
  maxDrawdown: number
}

interface MonthlyData {
  month: string
  profitLoss: number
  winRate: number
}

function Dashboard() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statistics, setStatistics] = useState<Statistics>({
    totalProfitLoss: 0,
    winRate: 0,
    profitFactor: 0,
    maxDrawdown: 0
  })
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])

  useEffect(() => {
    loadTrades()
  }, [])

  const loadTrades = async () => {
    try {
      const data = await db.getAllTrades()
      setTrades(data)
      calculateStatistics(data)
      calculateMonthlyData(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trades')
    } finally {
      setLoading(false)
    }
  }

  const calculateProfitLoss = (trade: Trade): number => {
    if (!trade.exit_price || !trade.entry_price || !trade.position_size) return 0
    return trade.type === 'long'
      ? (trade.exit_price - trade.entry_price) * trade.position_size
      : (trade.entry_price - trade.exit_price) * trade.position_size
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

  const calculateProfitFactor = (trades: Trade[]): number => {
    const closedTrades = trades.filter(trade => trade.status === 'closed')
    const grossProfit = closedTrades.reduce((total, trade) => {
      const pl = calculateProfitLoss(trade)
      return total + (pl > 0 ? pl : 0)
    }, 0)
    const grossLoss = Math.abs(closedTrades.reduce((total, trade) => {
      const pl = calculateProfitLoss(trade)
      return total + (pl < 0 ? pl : 0)
    }, 0))
    return grossLoss === 0 ? grossProfit : grossProfit / grossLoss
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

  const calculateStatistics = (trades: Trade[]) => {
    const closedTrades = trades.filter(t => t.status === 'closed')
    if (closedTrades.length === 0) return

    const totalProfitLoss = calculateTotalProfitLoss(trades)
    const winRate = calculateWinRate(trades)
    
    const profitFactor = calculateProfitFactor(trades)

    // Calculate max drawdown
    let maxDrawdown = calculateMaxDrawdown(trades)

    setStatistics({
      totalProfitLoss,
      winRate,
      profitFactor,
      maxDrawdown
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

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this trade?')) return

    try {
      await db.deleteTrade(id)
      setTrades(trades.filter(trade => trade.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade')
    }
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
          <h3 className="text-sm font-medium text-gray-500">Profit Factor</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {statistics.profitFactor.toFixed(2)}
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

      {/* Recent Trades */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">Recent Trades</h2>
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
                            {profitLoss >= 0 ? '+' : ''}${profitLoss.toFixed(2)}
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