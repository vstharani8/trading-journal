import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from 'date-fns'
import { db, type Trade } from '../services/db'

function TradeList() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [filters, setFilters] = useState({
    dateRange: 'all',
    asset: 'all',
    profitRange: 'all',
    status: 'all',
    strategy: 'all',
  })
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Trade
    direction: 'asc' | 'desc'
  }>({ key: 'entryDate', direction: 'desc' })
  const [currentPage, setCurrentPage] = useState(1)
  const tradesPerPage = 10

  useEffect(() => {
    const loadTrades = async () => {
      const savedTrades = await db.getAllTrades()
      setTrades(savedTrades)
    }
    loadTrades()
  }, [])

  const handleSort = (key: keyof Trade) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      await db.deleteTrade(id)
      setTrades((prev) => prev.filter((trade) => trade.id !== id))
    }
  }

  const filteredTrades = trades.filter((trade) => {
    // Date range filter
    if (filters.dateRange !== 'all') {
      const today = new Date()
      const tradeDate = parseISO(trade.entryDate)
      switch (filters.dateRange) {
        case 'today':
          if (!isWithinInterval(tradeDate, { start: startOfDay(today), end: endOfDay(today) })) {
            return false
          }
          break
        case 'week':
          const weekAgo = new Date(today.setDate(today.getDate() - 7))
          if (!isWithinInterval(tradeDate, { start: weekAgo, end: new Date() })) {
            return false
          }
          break
        case 'month':
          const monthAgo = new Date(today.setMonth(today.getMonth() - 1))
          if (!isWithinInterval(tradeDate, { start: monthAgo, end: new Date() })) {
            return false
          }
          break
      }
    }

    // Asset filter
    if (filters.asset !== 'all' && trade.symbol !== filters.asset) {
      return false
    }

    // Status filter
    if (filters.status !== 'all' && trade.status !== filters.status) {
      return false
    }

    // Strategy filter
    if (filters.strategy !== 'all' && trade.strategy !== filters.strategy) {
      return false
    }

    // Profit range filter
    if (filters.profitRange !== 'all' && trade.status === 'closed') {
      const profitLoss = trade.type === 'long'
        ? (trade.exitPrice! - trade.entryPrice) * trade.positionSize
        : (trade.entryPrice - trade.exitPrice!) * trade.positionSize
      
      if (filters.profitRange === 'profit' && profitLoss <= 0) {
        return false
      }
      if (filters.profitRange === 'loss' && profitLoss >= 0) {
        return false
      }
    }

    return true
  })

  const sortedTrades = [...filteredTrades].sort((a, b) => {
    if (sortConfig.key === 'entryDate' || sortConfig.key === 'exitDate') {
      const dateA = a[sortConfig.key] ? parseISO(a[sortConfig.key]!) : new Date(0)
      const dateB = b[sortConfig.key] ? parseISO(b[sortConfig.key]!) : new Date(0)
      return sortConfig.direction === 'asc'
        ? dateA.getTime() - dateB.getTime()
        : dateB.getTime() - dateA.getTime()
    }
    return sortConfig.direction === 'asc'
      ? (a[sortConfig.key] as number) - (b[sortConfig.key] as number)
      : (b[sortConfig.key] as number) - (a[sortConfig.key] as number)
  })

  const totalPages = Math.ceil(sortedTrades.length / tradesPerPage)
  const paginatedTrades = sortedTrades.slice(
    (currentPage - 1) * tradesPerPage,
    currentPage * tradesPerPage
  )

  const calculateProfitLoss = (trade: Trade) => {
    if (trade.status === 'open') return null
    const profitLoss = trade.type === 'long'
      ? (trade.exitPrice! - trade.entryPrice) * trade.positionSize
      : (trade.entryPrice - trade.exitPrice!) * trade.positionSize
    return profitLoss - (trade.fees || 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Trade History</h1>
        <Link
          to="/trades/new"
          className="btn btn-primary flex items-center gap-2"
        >
          <span>New Trade</span>
        </Link>
      </div>

      {/* Filters */}
      <div className="card grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-gray-700">Date Range</label>
          <select
            className="input mt-1"
            value={filters.dateRange}
            onChange={(e) => setFilters({ ...filters, dateRange: e.target.value })}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Asset</label>
          <select
            className="input mt-1"
            value={filters.asset}
            onChange={(e) => setFilters({ ...filters, asset: e.target.value })}
          >
            <option value="all">All Assets</option>
            {Array.from(new Set(trades.map((t) => t.symbol))).map((symbol) => (
              <option key={symbol} value={symbol}>
                {symbol}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            className="input mt-1"
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="all">All Trades</option>
            <option value="open">Open</option>
            <option value="closed">Closed</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Strategy</label>
          <select
            className="input mt-1"
            value={filters.strategy}
            onChange={(e) => setFilters({ ...filters, strategy: e.target.value })}
          >
            <option value="all">All Strategies</option>
            {Array.from(new Set(trades.map((t) => t.strategy).filter(Boolean))).map((strategy) => (
              <option key={strategy} value={strategy || ''}>
                {strategy}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Profit Range</label>
          <select
            className="input mt-1"
            value={filters.profitRange}
            onChange={(e) => setFilters({ ...filters, profitRange: e.target.value })}
          >
            <option value="all">All Trades</option>
            <option value="profit">Profitable</option>
            <option value="loss">Losses</option>
          </select>
        </div>
      </div>

      {/* Trade Table */}
      <div className="card overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('entryDate')}
              >
                Entry Date
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('symbol')}
              >
                Symbol
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('type')}
              >
                Type
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('entryPrice')}
              >
                Entry
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                onClick={() => handleSort('exitPrice')}
              >
                Exit
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                P/L
              </th>
              <th scope="col" className="relative px-6 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTrades.map((trade) => {
              const profitLoss = calculateProfitLoss(trade)
              return (
                <tr key={trade.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(parseISO(trade.entryDate), 'MMM d, yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.symbol}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        trade.type === 'long'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {trade.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${trade.entryPrice.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {trade.status === 'closed' ? `$${trade.exitPrice!.toFixed(2)}` : '-'}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      profitLoss === null
                        ? 'text-gray-500'
                        : profitLoss >= 0
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}
                  >
                    {profitLoss === null ? '-' : `$${profitLoss.toFixed(2)}`}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-3">
                      <Link
                        to={`/trades/${trade.id}`}
                        className="text-primary-600 hover:text-primary-900"
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
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center space-x-2">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="btn btn-secondary"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="btn btn-secondary"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}

export default TradeList 