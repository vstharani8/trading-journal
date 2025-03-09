import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'

type TradeFormData = {
  symbol: string
  type: 'long' | 'short'
  entry_date: string
  exit_date: string | null
  entry_price: number | null
  exit_price: number | null
  quantity: number
  strategy: string
  notes: string
  fees: number
  stop_loss: number | null
  take_profit: number | null
  screenshot: string | null
  status: 'open' | 'closed'
  user_id: string
}

const initialFormData: TradeFormData = {
  symbol: '',
  type: 'long',
  entry_date: new Date().toISOString().split('T')[0],
  exit_date: null,
  entry_price: null,
  exit_price: null,
  quantity: 0,
  strategy: '',
  notes: '',
  fees: 0,
  stop_loss: null,
  take_profit: null,
  screenshot: null,
  status: 'open',
  user_id: ''
}

function TradeForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState<TradeFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      setError(null)
      const trade = await db.getTrade(id!)
      if (!trade) {
        throw new Error('Trade not found')
      }
      setFormData({
        symbol: trade.symbol,
        type: trade.type,
        entry_date: trade.entry_date.split('T')[0],
        exit_date: trade.exit_date?.split('T')[0] || null,
        entry_price: trade.entry_price,
        exit_price: trade.exit_price,
        quantity: trade.quantity,
        strategy: trade.strategy,
        notes: trade.notes || '',
        fees: trade.fees,
        stop_loss: trade.stop_loss,
        take_profit: trade.take_profit,
        screenshot: trade.screenshot,
        status: trade.status,
        user_id: trade.user_id
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      const submitData = {
        ...formData,
        entry_date: new Date(formData.entry_date).toISOString(),
        exit_date: formData.exit_date ? new Date(formData.exit_date).toISOString() : null
      }

      if (id) {
        const now = new Date().toISOString()
        await db.updateTrade({
          ...submitData,
          id,
          created_at: now,
          updated_at: now
        })
        setSuccess('Trade updated successfully')
        setTimeout(() => navigate('/trades'), 1500)
      } else {
        await db.addTrade(submitData)
        setSuccess('Trade created successfully')
        setTimeout(() => navigate('/trades'), 1500)
      }
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
    const numValue = name === 'quantity' || name === 'entry_price' || name === 'exit_price' || name === 'fees' || name === 'stop_loss' || name === 'take_profit'
      ? value === '' ? null : Number(value)
      : value

    setFormData(prev => ({ ...prev, [name]: numValue }))
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            {id ? 'Edit Trade' : 'New Trade'}
          </h1>
        </div>

        {error && (
          <div className="bg-red-50/80 backdrop-blur-lg border border-red-200 rounded-xl p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50/80 backdrop-blur-lg border border-green-200 rounded-xl p-4">
            <p className="text-green-600">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20 space-y-8">
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
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
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
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="entry_price" className="block text-sm font-medium text-gray-700">
                Entry Price
              </label>
              <div className="mt-2 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="entry_price"
                  id="entry_price"
                  required
                  step="0.01"
                  value={formData.entry_price || ''}
                  onChange={handleChange}
                  className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="exit_price" className="block text-sm font-medium text-gray-700">
                Exit Price
              </label>
              <div className="mt-2 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="exit_price"
                  id="exit_price"
                  step="0.01"
                  value={formData.exit_price || ''}
                  onChange={handleChange}
                  className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                Quantity
              </label>
              <input
                type="number"
                name="quantity"
                id="quantity"
                required
                min="0"
                step="1"
                value={formData.quantity}
                onChange={handleChange}
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
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
                value={formData.strategy}
                onChange={handleChange}
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="stop_loss" className="block text-sm font-medium text-gray-700">
                Stop Loss
              </label>
              <div className="mt-2 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="stop_loss"
                  id="stop_loss"
                  step="0.01"
                  value={formData.stop_loss || ''}
                  onChange={handleChange}
                  className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="take_profit" className="block text-sm font-medium text-gray-700">
                Take Profit
              </label>
              <div className="mt-2 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="take_profit"
                  id="take_profit"
                  step="0.01"
                  value={formData.take_profit || ''}
                  onChange={handleChange}
                  className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label htmlFor="fees" className="block text-sm font-medium text-gray-700">
                Fees
              </label>
              <div className="mt-2 relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">$</span>
                </div>
                <input
                  type="number"
                  name="fees"
                  id="fees"
                  min="0"
                  step="0.01"
                  value={formData.fees}
                  onChange={handleChange}
                  className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                Notes
              </label>
              <textarea
                name="notes"
                id="notes"
                rows={4}
                value={formData.notes}
                onChange={handleChange}
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/trades')}
              className="inline-flex items-center px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {loading ? 'Saving...' : id ? 'Update Trade' : 'Create Trade'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default TradeForm 