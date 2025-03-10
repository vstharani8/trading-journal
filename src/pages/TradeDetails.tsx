import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { db } from '../services/supabase'
import type { Trade } from '../services/supabase'
import TradeFeedback from '../components/TradeFeedback'

function TradeDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (id) {
      loadTrade()
    }
  }, [id])

  const loadTrade = async () => {
    try {
      setLoading(true)
      setError(null)
      const tradeData = await db.getTrade(id!)
      setTrade(tradeData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!trade || !window.confirm('Are you sure you want to delete this trade?')) {
      return
    }

    try {
      await db.deleteTrade(trade.id)
      navigate('/trades')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete trade')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
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

  if (!trade) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Trade not found</h3>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Trade Details
        </h1>
        <div className="flex gap-4">
          <button
            onClick={() => navigate(`/trades/edit/${trade.id}`)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Edit Trade
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Delete Trade
          </button>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Symbol</h3>
            <p className="mt-1 text-lg font-medium text-gray-900">{trade.symbol}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Trade Type</h3>
            <p className="mt-1">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  trade.type === 'long'
                    ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                    : 'bg-gradient-to-r from-red-100 to-rose-100 text-red-800'
                }`}
              >
                {trade.type}
              </span>
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Entry Price</h3>
            <p className="mt-1 text-lg font-medium text-gray-900">
              ${trade.entry_price?.toFixed(2) || '-'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Exit Price</h3>
            <p className="mt-1 text-lg font-medium text-gray-900">
              ${trade.exit_price?.toFixed(2) || '-'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Quantity</h3>
            <p className="mt-1 text-lg font-medium text-gray-900">{trade.quantity}</p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500">Entry Date</h3>
            <p className="mt-1 text-lg font-medium text-gray-900">
              {format(new Date(trade.entry_date), 'MMM d, yyyy')}
            </p>
          </div>

          {trade.exit_date && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Exit Date</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                {format(new Date(trade.exit_date), 'MMM d, yyyy')}
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500">Status</h3>
            <p className="mt-1">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  trade.status === 'open'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {trade.status}
              </span>
            </p>
          </div>

          {trade.stop_loss && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Stop Loss</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                ${trade.stop_loss.toFixed(2)}
              </p>
            </div>
          )}

          {trade.take_profit && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Take Profit</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                ${trade.take_profit.toFixed(2)}
              </p>
            </div>
          )}

          {trade.fees > 0 && (
            <div>
              <h3 className="text-sm font-medium text-gray-500">Fees</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">
                ${trade.fees.toFixed(2)}
              </p>
            </div>
          )}

          {trade.strategy && (
            <div className="sm:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Strategy</h3>
              <p className="mt-1 text-lg font-medium text-gray-900">{trade.strategy}</p>
            </div>
          )}

          {trade.notes && (
            <div className="sm:col-span-2">
              <h3 className="text-sm font-medium text-gray-500">Notes</h3>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{trade.notes}</p>
            </div>
          )}
        </div>

        {/* Trade Context */}
        {(trade.market_conditions || trade.trade_setup || trade.emotional_state) && (
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Trade Context</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {trade.market_conditions && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Market Conditions</h4>
                  <p className="mt-1 text-sm text-gray-900">{trade.market_conditions}</p>
                </div>
              )}
              {trade.trade_setup && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Trade Setup</h4>
                  <p className="mt-1 text-sm text-gray-900">{trade.trade_setup}</p>
                </div>
              )}
              {trade.emotional_state && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Emotional State</h4>
                  <p className="mt-1 text-sm text-gray-900">{trade.emotional_state}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Trade Analysis */}
        {(trade.proficiency || trade.growth_areas || trade.exit_trigger) && (
          <div className="mt-8 border-t border-gray-200 pt-8">
            <h3 className="text-lg font-medium text-gray-900 mb-6">Trade Analysis</h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {trade.proficiency && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Proficiency</h4>
                  <p className="mt-1 text-sm text-gray-900">{trade.proficiency}</p>
                </div>
              )}
              {trade.growth_areas && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Growth Areas</h4>
                  <p className="mt-1 text-sm text-gray-900">{trade.growth_areas}</p>
                </div>
              )}
              {trade.exit_trigger && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Exit Trigger</h4>
                  <p className="mt-1 text-sm text-gray-900">{trade.exit_trigger}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI Feedback */}
        <div className="mt-8 border-t border-gray-200 pt-8">
          <TradeFeedback trade={trade} onFeedbackGenerated={loadTrade} />
        </div>
      </div>
    </div>
  )
}

export default TradeDetails 