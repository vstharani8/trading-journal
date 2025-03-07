import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Trade } from '../services/supabase'

type TradeFormData = {
  symbol: string
  type: 'long' | 'short'
  entry_date: string
  exit_date: string | null
  entry_price: number | null
  exit_price: number | null
  position_size: number | null
  strategy: string
  notes: string
  fees: number
  stop_loss: number | null
  take_profit: number | null
  screenshot: string | null
  status: 'open' | 'closed'
  user_id: string
}

interface UserSettings {
  totalCapital: number
  riskPerTrade: number
}

const initialFormData: TradeFormData = {
  symbol: '',
  type: 'long',
  entry_date: new Date().toISOString().split('T')[0],
  exit_date: null,
  entry_price: null,
  exit_price: null,
  position_size: null,
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
  const [userSettings, setUserSettings] = useState<UserSettings>({
    totalCapital: 0,
    riskPerTrade: 1
  })
  const [quantity, setQuantity] = useState<number>(0)

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, user_id: user.id }))
      loadUserSettings()
    }
  }, [user])

  useEffect(() => {
    if (id) {
      loadTrade()
    }
  }, [id])

  const loadUserSettings = async () => {
    try {
      const data = await db.getUserSettings(user?.id || '')
      if (data) {
        setUserSettings({
          totalCapital: data.total_capital || 0,
          riskPerTrade: data.risk_per_trade || 1
        })
      }
    } catch (err) {
      console.error('Error loading user settings:', err)
    }
  }

  const loadTrade = async () => {
    try {
      setLoading(true)
      const trade = await db.getTrade(id!)
      if (trade) {
        const { id: _, created_at: __, updated_at: ___, ...tradeData } = trade
        setFormData({
          ...tradeData,
          entry_price: tradeData.entry_price || null,
          position_size: tradeData.position_size || null
        })
        // Calculate quantity from position size and entry price
        if (trade.entry_price && trade.position_size) {
          setQuantity(trade.position_size / trade.entry_price)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade')
    } finally {
      setLoading(false)
    }
  }

  const calculatePositionSize = (entryPrice: number | null, qty: number): number => {
    if (!entryPrice) return 0
    return entryPrice * qty
  }

  const calculateMaxQuantity = () => {
    if (!formData.entry_price || !formData.stop_loss) return 0
    const riskAmount = (userSettings.totalCapital * userSettings.riskPerTrade) / 100
    const stopLossDistance = Math.abs(formData.entry_price - formData.stop_loss)
    return riskAmount / stopLossDistance
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const submitData = {
        ...formData,
        entry_price: formData.entry_price || 0,
        position_size: formData.position_size || 0
      }
      
      if (id) {
        await db.updateTrade({ ...submitData, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      } else {
        await db.addTrade(submitData)
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
    const numValue = name === 'position_size' || name === 'entry_price' || name === 'exit_price' || name === 'fees' || name === 'stop_loss' || name === 'take_profit'
      ? value === '' ? null : Number(value)
      : value

    setFormData(prev => ({ ...prev, [name]: numValue }))

    // Update quantity when entry price changes
    if (name === 'entry_price') {
      const entryPrice = Number(value)
      if (entryPrice > 0 && formData.position_size) {
        const newQuantity = formData.position_size / entryPrice
        setQuantity(newQuantity)
      }
    }

    // Update position size when stop loss changes
    if (name === 'stop_loss' && formData.entry_price) {
      const maxQty = calculateMaxQuantity()
      setQuantity(maxQty)
      const newPositionSize = calculatePositionSize(formData.entry_price, maxQty)
      setFormData(prev => ({
        ...prev,
        position_size: newPositionSize
      }))
    }
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuantity = Number(e.target.value)
    setQuantity(newQuantity)
    
    if (formData.entry_price !== null) {
      const newPositionSize = calculatePositionSize(formData.entry_price, newQuantity)
      setFormData(prev => ({ ...prev, position_size: newPositionSize }))
    }
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
              value={formData.entry_price || ''}
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
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              name="quantity"
              id="quantity"
              required
              min="0.00000001"
              step="0.00000001"
              value={quantity || ''}
              onChange={handleQuantityChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            />
          </div>

          <div>
            <label htmlFor="position_size" className="block text-sm font-medium text-gray-700">
              Position Size
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="position_size"
                id="position_size"
                required
                step="0.01"
                value={formData.position_size || ''}
                readOnly
                className="pl-7 mt-1 block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="stop_loss" className="block text-sm font-medium text-gray-700">
              Stop Loss
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
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
                className="pl-7 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            {formData.stop_loss && formData.entry_price && (
              <p className="mt-1 text-sm text-gray-500">
                Risk: ${Math.abs(formData.entry_price - formData.stop_loss).toFixed(2)} per share
              </p>
            )}
          </div>

          <div>
            <label htmlFor="take_profit" className="block text-sm font-medium text-gray-700">
              Take Profit
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
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
                className="pl-7 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="fees" className="block text-sm font-medium text-gray-700">
              Fees
            </label>
            <div className="mt-1 relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500 sm:text-sm">$</span>
              </div>
              <input
                type="number"
                name="fees"
                id="fees"
                step="0.01"
                value={formData.fees || ''}
                onChange={handleChange}
                className="pl-7 mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
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