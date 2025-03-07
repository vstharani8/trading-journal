import { useState, useEffect } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts'
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns'
import { db, type Trade } from '../services/db'

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']

interface Statistics {
  totalTrades: number
  closedTrades: number
  winningTrades: number
  losingTrades: number
  totalProfitLoss: number
  winRate: number
  averageWin: number
  averageLoss: number
  profitFactor: number
  maxDrawdown: number
}

function Dashboard() {
  const [statistics, setStatistics] = useState<Statistics>({
    totalTrades: 0,
    closedTrades: 0,
    winningTrades: 0,
    losingTrades: 0,
    totalProfitLoss: 0,
    winRate: 0,
    averageWin: 0,
    averageLoss: 0,
    profitFactor: 0,
    maxDrawdown: 0,
  })
  const [monthlyData, setMonthlyData] = useState<any[]>([])
  const [strategyData, setStrategyData] = useState<any[]>([])
  const [symbolData, setSymbolData] = useState<any[]>([])

  useEffect(() => {
    const loadTrades = async () => {
      try {
        const fetchedTrades = await db.getAllTrades()
        calculateStatistics(fetchedTrades)
        calculateMonthlyData(fetchedTrades)
        calculateStrategyData(fetchedTrades)
        calculateSymbolData(fetchedTrades)
      } catch (error) {
        console.error('Error loading trades:', error)
      }
    }
    loadTrades()
  }, [])

  const calculateProfitLoss = (trade: Trade) => {
    if (trade.status === 'open') return 0
    const profitLoss = trade.type === 'long'
      ? (trade.exitPrice! - trade.entryPrice) * trade.positionSize
      : (trade.entryPrice - trade.exitPrice!) * trade.positionSize
    return profitLoss - (trade.fees || 0)
  }

  const calculateStatistics = (trades: Trade[]) => {
    const closedTrades = trades.filter((t) => t.status === 'closed')
    const winningTrades = closedTrades.filter((t) => calculateProfitLoss(t) > 0)
    const losingTrades = closedTrades.filter((t) => calculateProfitLoss(t) < 0)
    
    const totalProfitLoss = closedTrades.reduce((sum, t) => sum + calculateProfitLoss(t), 0)
    const totalWins = winningTrades.reduce((sum, t) => sum + calculateProfitLoss(t), 0)
    const totalLosses = Math.abs(losingTrades.reduce((sum, t) => sum + calculateProfitLoss(t), 0))
    
    const winRate = closedTrades.length > 0 ? (winningTrades.length / closedTrades.length) * 100 : 0
    const averageWin = winningTrades.length > 0 ? totalWins / winningTrades.length : 0
    const averageLoss = losingTrades.length > 0 ? totalLosses / losingTrades.length : 0
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0

    // Calculate max drawdown
    let maxDrawdown = 0
    let peak = 0
    let balance = 0
    const sortedTrades = [...closedTrades].sort((a, b) => 
      new Date(a.exitDate!).getTime() - new Date(b.exitDate!).getTime()
    )
    
    sortedTrades.forEach((trade) => {
      balance += calculateProfitLoss(trade)
      if (balance > peak) {
        peak = balance
      }
      const drawdown = peak - balance
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    })

    setStatistics({
      totalTrades: trades.length,
      closedTrades: closedTrades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      totalProfitLoss,
      winRate,
      averageWin,
      averageLoss,
      profitFactor,
      maxDrawdown,
    })
  }

  const calculateMonthlyData = (trades: Trade[]) => {
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    })

    const monthlyStats = last6Months.map((month) => {
      const monthTrades = trades.filter((trade) => {
        const tradeDate = parseISO(trade.entryDate)
        return isWithinInterval(tradeDate, {
          start: startOfMonth(month),
          end: endOfMonth(month),
        })
      })

      const closedTrades = monthTrades.filter((t) => t.status === 'closed')
      const profitLoss = closedTrades.reduce((sum, t) => sum + calculateProfitLoss(t), 0)
      const winRate = closedTrades.length > 0
        ? (closedTrades.filter((t) => calculateProfitLoss(t) > 0).length / closedTrades.length) * 100
        : 0

      return {
        month: format(month, 'MMM yyyy'),
        profitLoss,
        winRate,
        trades: monthTrades.length,
      }
    })

    setMonthlyData(monthlyStats)
  }

  const calculateStrategyData = (trades: Trade[]) => {
    const strategyStats = trades.reduce((acc: { [key: string]: number }, trade) => {
      const strategy = trade.strategy || 'Uncategorized'
      acc[strategy] = (acc[strategy] || 0) + 1
      return acc
    }, {})

    const data = Object.entries(strategyStats).map(([name, value]) => ({
      name,
      value,
    }))

    setStrategyData(data)
  }

  const calculateSymbolData = (trades: Trade[]) => {
    const symbolStats = trades.reduce((acc: { [key: string]: number }, trade) => {
      acc[trade.symbol] = (acc[trade.symbol] || 0) + 1
      return acc
    }, {})

    const data = Object.entries(symbolStats).map(([name, value]) => ({
      name,
      value,
    }))

    setSymbolData(data)
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-gray-900">Trading Dashboard</h1>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Total Profit/Loss</h3>
          <p className={`mt-2 text-2xl font-semibold ${
            statistics.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'
          }`}>
            ${statistics.totalProfitLoss.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Win Rate</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {statistics.winRate.toFixed(1)}%
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Profit Factor</h3>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {statistics.profitFactor.toFixed(2)}
          </p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500">Max Drawdown</h3>
          <p className="mt-2 text-2xl font-semibold text-red-600">
            ${statistics.maxDrawdown.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="card">
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

      {/* Strategy Distribution */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Strategy Distribution</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={strategyData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {strategyData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Symbol Distribution */}
      <div className="card">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Symbol Distribution</h2>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={symbolData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="value" fill="#8884d8" name="Number of Trades" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default Dashboard 