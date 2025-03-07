import { useState, useEffect } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { db, type Trade } from '../services/db'

type TradeFormData = Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>

const initialFormData: TradeFormData = {
  symbol: '',
  entryDate: new Date().toISOString().slice(0, 16),
  exitDate: null,
  entryPrice: 0,
  exitPrice: null,
  positionSize: 0,
  type: 'long',
  stopLoss: null,
  takeProfit: null,
  fees: null,
  strategy: null,
  notes: '',
  screenshot: null,
  status: 'open'
}

interface FormErrors {
  symbol?: string
  entryDate?: string
  exitDate?: string
  entryPrice?: string
  exitPrice?: string
  positionSize?: string
  status?: string
}

function TradeForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [formData, setFormData] = useState<TradeFormData>(initialFormData)
  const [errors, setErrors] = useState<FormErrors>({})
  const [strategies, setStrategies] = useState<string[]>([])

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load strategies
        const savedStrategies = await db.getStrategies()
        setStrategies(savedStrategies)

        // If editing, load trade data
        if (id) {
          const trade = await db.getTrade(id)
          if (trade) {
            const { createdAt, updatedAt, id: _, ...formData } = trade
            setFormData(formData)
          }
        }
      } catch (error) {
        console.error('Error loading form data:', error)
      }
    }

    loadData()
  }, [id, location.key])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    if (!formData.symbol) {
      newErrors.symbol = 'Symbol is required'
    }
    if (!formData.entryDate) {
      newErrors.entryDate = 'Entry date is required'
    }
    if (!formData.entryPrice || formData.entryPrice <= 0) {
      newErrors.entryPrice = 'Valid entry price is required'
    }
    if (!formData.positionSize || formData.positionSize <= 0) {
      newErrors.positionSize = 'Valid position size is required'
    }
    if (formData.status === 'closed' && (!formData.exitDate || !formData.exitPrice)) {
      newErrors.exitDate = 'Exit date and price are required for closed trades'
      newErrors.exitPrice = 'Exit price is required for closed trades'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      return
    }

    const now = new Date().toISOString()
    const tradeData: Trade = {
      ...formData,
      id: id || crypto.randomUUID(),
      createdAt: now,
      updatedAt: now,
    }

    if (id) {
      await db.updateTrade(tradeData)
    } else {
      await db.addTrade(tradeData)
    }

    navigate('/trades')
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'notes' || name === 'symbol' || name === 'type' || name === 'entryDate' || name === 'exitDate' || name === 'status'
        ? value
        : type === 'number'
        ? (value ? Number(value) : null)
        : value,
    }))
  }

  const handleScreenshotUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({
          ...prev,
          screenshot: reader.result as string,
        }))
      }
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">
          {id ? 'Edit Trade' : 'New Trade'}
        </h1>
        <button
          onClick={() => navigate('/trades')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Symbol</label>
            <input
              type="text"
              name="symbol"
              value={formData.symbol}
              onChange={handleInputChange}
              className="input mt-1"
              required
            />
            {errors.symbol && (
              <p className="mt-1 text-sm text-red-600">{errors.symbol}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Trade Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              className="input mt-1"
              required
            >
              <option value="long">Long</option>
              <option value="short">Short</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Entry Date</label>
            <input
              type="datetime-local"
              name="entryDate"
              value={formData.entryDate}
              onChange={handleInputChange}
              className="input mt-1"
              required
            />
            {errors.entryDate && (
              <p className="mt-1 text-sm text-red-600">{errors.entryDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Exit Date</label>
            <input
              type="datetime-local"
              name="exitDate"
              value={formData.exitDate || ''}
              onChange={handleInputChange}
              className="input mt-1"
              disabled={formData.status === 'open'}
            />
            {errors.exitDate && (
              <p className="mt-1 text-sm text-red-600">{errors.exitDate}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Entry Price</label>
            <input
              type="number"
              name="entryPrice"
              value={formData.entryPrice}
              onChange={handleInputChange}
              className="input mt-1"
              step="0.01"
              required
            />
            {errors.entryPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.entryPrice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Exit Price</label>
            <input
              type="number"
              name="exitPrice"
              value={formData.exitPrice || ''}
              onChange={handleInputChange}
              className="input mt-1"
              step="0.01"
              disabled={formData.status === 'open'}
            />
            {errors.exitPrice && (
              <p className="mt-1 text-sm text-red-600">{errors.exitPrice}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Position Size</label>
            <input
              type="number"
              name="positionSize"
              value={formData.positionSize}
              onChange={handleInputChange}
              className="input mt-1"
              required
            />
            {errors.positionSize && (
              <p className="mt-1 text-sm text-red-600">{errors.positionSize}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Status</label>
            <select
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              className="input mt-1"
              required
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stop Loss</label>
            <input
              type="number"
              name="stopLoss"
              value={formData.stopLoss || ''}
              onChange={handleInputChange}
              className="input mt-1"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Take Profit</label>
            <input
              type="number"
              name="takeProfit"
              value={formData.takeProfit || ''}
              onChange={handleInputChange}
              className="input mt-1"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Fees</label>
            <input
              type="number"
              name="fees"
              value={formData.fees || ''}
              onChange={handleInputChange}
              className="input mt-1"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Strategy</label>
            <select
              name="strategy"
              value={formData.strategy || ''}
              onChange={handleInputChange}
              className="input mt-1"
            >
              <option value="">Select a strategy</option>
              {strategies.map((strategy) => (
                <option key={strategy} value={strategy}>
                  {strategy}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Screenshot</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleScreenshotUpload}
            className="mt-1 block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-primary-50 file:text-primary-700
              hover:file:bg-primary-100"
          />
          {formData.screenshot && (
            <img
              src={formData.screenshot}
              alt="Trade screenshot"
              className="mt-2 max-w-xs rounded-lg shadow-sm"
            />
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows={4}
            className="input mt-1"
            placeholder="Enter your trade notes, strategy, market conditions, etc."
          />
        </div>

        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">
            {id ? 'Update Trade' : 'Save Trade'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TradeForm 