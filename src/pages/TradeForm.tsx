import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Trade } from '../services/supabase'

type TradeFormData = Omit<Trade, 'id' | 'created_at' | 'updated_at'>

const initialFormData: TradeFormData = {
  symbol: '',
  type: 'long',
  entry_date: new Date().toISOString().split('T')[0],
  exit_date: null,
  entry_price: 0,
  exit_price: null,
  position_size: 1,
  strategy: '',
  notes: '',
  fees: 0,
  stop_loss: null,
  take_profit: null,
  screenshot: null,
  status: 'open',
  user_id: '', // This will be set by the auth context
}

function TradeForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState<TradeFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, user_id: user.id }))
    }
  }, [user])

  useEffect(() => {
    if (id) {
      loadTrade()
    }
  }, [id])

  const loadTrade = async () => {
    try {
      setLoading(true)
      const trade = await db.getTrade(id!)
      if (trade) {
        const { id: _, created_at: __, updated_at: ___, ...tradeData } = trade
        setFormData(tradeData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (id) {
        await db.updateTrade({ ...formData, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      } else {
        await db.addTrade(formData)
      }
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save trade')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'position_size' || name === 'entry_price' || name === 'exit_price' || name === 'fees' || name === 'stop_loss' || name === 'take_profit'
        ? Number(value)
        : value,
    }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {id ? 'Edit Trade' : 'New Trade'}
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
              Symbol
            </label>
            <input
              type="text"
              name="symbol"
              id="symbol"
              required
              value={formData.symbol}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700">
              Type
            </label>
            <select
              name="type"
              id="type"
              required
              value={formData.type}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          <div>
            <label htmlFor="entry_date" className="block text-sm font-medium text-gray-700">
              Entry Date
            </label>
            <input
              type="date"
              name="entry_date"
              id="entry_date"
              required
              value={formData.entry_date}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="exit_date" className="block text-sm font-medium text-gray-700">
              Exit Date
            </label>
            <input
              type="date"
              name="exit_date"
              id="exit_date"
              value={formData.exit_date || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="entry_price" className="block text-sm font-medium text-gray-700">
              Entry Price
            </label>
            <input
              type="number"
              name="entry_price"
              id="entry_price"
              required
              step="0.01"
              value={formData.entry_price}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="exit_price" className="block text-sm font-medium text-gray-700">
              Exit Price
            </label>
            <input
              type="number"
              name="exit_price"
              id="exit_price"
              step="0.01"
              value={formData.exit_price || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="position_size" className="block text-sm font-medium text-gray-700">
              Position Size
            </label>
            <input
              type="number"
              name="position_size"
              id="position_size"
              required
              min="1"
              value={formData.position_size}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="fees" className="block text-sm font-medium text-gray-700">
              Fees
            </label>
            <input
              type="number"
              name="fees"
              id="fees"
              step="0.01"
              value={formData.fees || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="stop_loss" className="block text-sm font-medium text-gray-700">
              Stop Loss
            </label>
            <input
              type="number"
              name="stop_loss"
              id="stop_loss"
              step="0.01"
              value={formData.stop_loss || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="take_profit" className="block text-sm font-medium text-gray-700">
              Take Profit
            </label>
            <input
              type="number"
              name="take_profit"
              id="take_profit"
              step="0.01"
              value={formData.take_profit || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700">
              Status
            </label>
            <select
              name="status"
              id="status"
              required
              value={formData.status}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
            Strategy
          </label>
          <input
            type="text"
            name="strategy"
            id="strategy"
            required
            value={formData.strategy || ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            name="notes"
            id="notes"
            rows={4}
            value={formData.notes}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          />
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Trade'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TradeForm 