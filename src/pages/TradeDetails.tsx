import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format } from 'date-fns'

interface Trade {
  id: number
  symbol: string
  entryPrice: number
  exitPrice: number
  positionSize: number
  type: 'long' | 'short'
  date: string
  profitLoss: number
  stopLoss: number
  takeProfit: number
  notes: string
}

function TradeDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [trade, setTrade] = useState<Trade | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editedTrade, setEditedTrade] = useState<Trade | null>(null)

  useEffect(() => {
    // TODO: Fetch trade from API
    const mockTrade: Trade = {
      id: 1,
      symbol: 'AAPL',
      entryPrice: 150,
      exitPrice: 155,
      positionSize: 100,
      type: 'long',
      date: '2024-03-01',
      profitLoss: 500,
      stopLoss: 145,
      takeProfit: 160,
      notes: 'Strong technical setup with clear support and resistance levels.',
    }
    setTrade(mockTrade)
    setEditedTrade(mockTrade)
  }, [id])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    // TODO: Save trade to API
    console.log('Saving trade:', editedTrade)
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this trade?')) {
      // TODO: Delete trade from API
      console.log('Deleting trade:', id)
      navigate('/trades')
    }
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    if (!editedTrade) return
    const { name, value } = e.target
    setEditedTrade({
      ...editedTrade,
      [name]: name === 'type' ? value : name.includes('Price') || name === 'positionSize' || name === 'stopLoss' || name === 'takeProfit'
        ? parseFloat(value) || 0
        : value,
    })
  }

  if (!trade) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold text-gray-900">Trade Details</h1>
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button
                onClick={() => setIsEditing(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
              >
                Save Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleEdit}
                className="btn btn-secondary"
              >
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="btn bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="card">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700">Symbol</label>
            {isEditing ? (
              <input
                type="text"
                name="symbol"
                value={editedTrade?.symbol}
                onChange={handleChange}
                className="input mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{trade.symbol}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Trade Type</label>
            {isEditing ? (
              <select
                name="type"
                value={editedTrade?.type}
                onChange={handleChange}
                className="input mt-1"
              >
                <option value="long">Long</option>
                <option value="short">Short</option>
              </select>
            ) : (
              <p className="mt-1">
                <span
                  className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    trade.type === 'long'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {trade.type}
                </span>
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Entry Price</label>
            {isEditing ? (
              <input
                type="number"
                name="entryPrice"
                value={editedTrade?.entryPrice}
                onChange={handleChange}
                className="input mt-1"
                step="0.01"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">${trade.entryPrice.toFixed(2)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Exit Price</label>
            {isEditing ? (
              <input
                type="number"
                name="exitPrice"
                value={editedTrade?.exitPrice}
                onChange={handleChange}
                className="input mt-1"
                step="0.01"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">${trade.exitPrice.toFixed(2)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Position Size</label>
            {isEditing ? (
              <input
                type="number"
                name="positionSize"
                value={editedTrade?.positionSize}
                onChange={handleChange}
                className="input mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">{trade.positionSize}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            {isEditing ? (
              <input
                type="date"
                name="date"
                value={editedTrade?.date}
                onChange={handleChange}
                className="input mt-1"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">
                {format(new Date(trade.date), 'MMM d, yyyy')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Stop Loss</label>
            {isEditing ? (
              <input
                type="number"
                name="stopLoss"
                value={editedTrade?.stopLoss}
                onChange={handleChange}
                className="input mt-1"
                step="0.01"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">${trade.stopLoss.toFixed(2)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Take Profit</label>
            {isEditing ? (
              <input
                type="number"
                name="takeProfit"
                value={editedTrade?.takeProfit}
                onChange={handleChange}
                className="input mt-1"
                step="0.01"
              />
            ) : (
              <p className="mt-1 text-sm text-gray-900">${trade.takeProfit.toFixed(2)}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Profit/Loss</label>
            <p
              className={`mt-1 text-sm font-medium ${
                trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              ${trade.profitLoss.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-700">Notes</label>
          {isEditing ? (
            <textarea
              name="notes"
              value={editedTrade?.notes}
              onChange={handleChange}
              rows={4}
              className="input mt-1"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{trade.notes}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default TradeDetails 