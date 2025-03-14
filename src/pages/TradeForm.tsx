import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Trade } from '../services/supabase'
import { generateTradeFeedback } from '../services/openai'
import TradeChart from '../components/TradeChart'
import { fetchHistoricalData, getChartDateRange, CandleData, Market } from '../services/marketData'

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
  market_conditions?: 'bullish' | 'bearish' | 'neutral' | null
  trade_setup?: string | null
  emotional_state?: 'confident' | 'uncertain' | 'neutral' | null
  proficiency?: string | null
  growth_areas?: string | null
  exit_trigger?: string | null
  ai_feedback_performance?: string | null
  ai_feedback_lessons?: string | null
  ai_feedback_mistakes?: string | null
  ai_feedback_generated_at?: string | null
  market: Market
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
  user_id: '',
  market_conditions: null,
  trade_setup: null,
  emotional_state: null,
  proficiency: null,
  growth_areas: null,
  exit_trigger: null,
  ai_feedback_performance: null,
  ai_feedback_lessons: null,
  ai_feedback_mistakes: null,
  ai_feedback_generated_at: null,
  market: 'US'
}

function TradeForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState<TradeFormData>(initialFormData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<string[]>([])
  const [userSettings, setUserSettings] = useState<{ 
    totalCapital: number;
    riskPerTrade: number;
  }>({
    totalCapital: 0,
    riskPerTrade: 1
  })
  const [suggestedSize, setSuggestedSize] = useState<number | null>(null)
  const [riskAmount, setRiskAmount] = useState<number | null>(null)
  const [accountRisk, setAccountRisk] = useState<number>(0.5)
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [chartError, setChartError] = useState<string | null>(null)

  useEffect(() => {
    if (user?.id) {
      setFormData(prev => ({ ...prev, user_id: user.id }))
      loadStrategies()
    }
  }, [user])

  useEffect(() => {
    if (id) {
      loadTrade()
    }
  }, [id])

  useEffect(() => {
    loadUserSettings()
  }, [user])

  useEffect(() => {
    calculatePositionSize()
  }, [formData.entry_price, formData.stop_loss, userSettings, accountRisk])

  useEffect(() => {
    if (formData.symbol && formData.entry_date) {
      loadChartData();
    }
  }, [formData.symbol, formData.entry_date, formData.exit_date, formData.market]);

  const loadStrategies = async () => {
    try {
      const userStrategies = await db.getStrategies(user?.id || '')
      setStrategies(userStrategies)
    } catch (error) {
      console.error('Error loading strategies:', error)
    }
  }

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
        user_id: trade.user_id,
        market_conditions: trade.market_conditions || null,
        trade_setup: trade.trade_setup || null,
        emotional_state: trade.emotional_state || null,
        proficiency: trade.proficiency || null,
        growth_areas: trade.growth_areas || null,
        exit_trigger: trade.exit_trigger || null,
        ai_feedback_performance: trade.ai_feedback_performance || null,
        ai_feedback_lessons: trade.ai_feedback_lessons || null,
        ai_feedback_mistakes: trade.ai_feedback_mistakes || null,
        ai_feedback_generated_at: trade.ai_feedback_generated_at || null,
        market: trade.market || 'US'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load trade')
    } finally {
      setLoading(false)
    }
  }

  const loadUserSettings = async () => {
    try {
      const settings = await db.getUserSettings(user?.id || '')
      if (settings) {
        setUserSettings({
          totalCapital: settings.total_capital || 0,
          riskPerTrade: settings.risk_per_trade || 1
        })
      }
    } catch (error) {
      console.error('Error loading user settings:', error)
    }
  }

  const calculatePositionSize = () => {
    if (!formData.entry_price || !formData.stop_loss || !userSettings.totalCapital) {
      setSuggestedSize(null)
      setRiskAmount(null)
      return
    }

    const riskPercentage = accountRisk / 100
    const maxRiskAmount = userSettings.totalCapital * riskPercentage
    const priceRisk = Math.abs(formData.entry_price - formData.stop_loss)
    
    if (priceRisk === 0) {
      setSuggestedSize(null)
      setRiskAmount(null)
      return
    }

    const calculatedSize = Math.floor(maxRiskAmount / priceRisk)
    setSuggestedSize(calculatedSize)
    setRiskAmount(calculatedSize * priceRisk)
  }

  const loadChartData = async () => {
    try {
      setChartError(null);
      const { startDate, endDate } = getChartDateRange(
        formData.entry_date, 
        formData.exit_date
      );
      const data = await fetchHistoricalData(
        formData.symbol, 
        startDate, 
        endDate,
        formData.market
      );
      setCandleData(data);
    } catch (error) {
      console.error('Error loading chart data:', error);
      const errorMessage = formData.market === 'IN' 
        ? 'Failed to load chart data. Please check if the NSE symbol is correct (e.g., TATAMOTORS, RELIANCE).'
        : 'Failed to load chart data. Please check if the symbol is correct.';
      setChartError(errorMessage);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setLoading(true)
      setError(null)
      setSuccess(null)

      // Validate required fields
      if (!formData.user_id) {
        throw new Error('User ID is required. Please ensure you are logged in.')
      }

      // Validate that closed trades must have an exit date
      if (formData.status === 'closed' && !formData.exit_date) {
        throw new Error('Exit date is required for closed trades')
      }

      // Prepare the submission data with all fields
      const now = new Date().toISOString();
      const submitData = {
        ...formData,
        entry_date: new Date(formData.entry_date).toISOString(),
        exit_date: formData.exit_date ? new Date(formData.exit_date).toISOString() : null,
        notes: formData.notes || '', // Ensure notes is never null
        fees: formData.fees || 0, // Ensure fees is never null
        strategy: formData.strategy || 'Unknown', // Ensure strategy is never null
        market_conditions: formData.market_conditions || null,
        trade_setup: formData.trade_setup || null,
        emotional_state: formData.emotional_state || null,
        proficiency: formData.proficiency || null,
        growth_areas: formData.growth_areas || null,
        exit_trigger: formData.exit_trigger || null,
        // Preserve existing AI feedback if available
        ai_feedback_performance: formData.ai_feedback_performance || null,
        ai_feedback_lessons: formData.ai_feedback_lessons || null,
        ai_feedback_mistakes: formData.ai_feedback_mistakes || null,
        ai_feedback_generated_at: formData.ai_feedback_generated_at || null,
        created_at: now,
        updated_at: now
      }

      if (id) {
        await db.updateTrade({
          ...submitData,
          id
        })
        setSuccess('Trade updated successfully')
      } else {
        await db.addTrade(submitData)
        setSuccess('Trade created successfully')
      }
      setTimeout(() => navigate('/trades'), 1500)
    } catch (err) {
      console.error('Error saving trade:', err)
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

    setFormData(prev => {
      const newData = { ...prev, [name]: numValue }
      
      // Automatically set status to 'closed' when exit price is entered
      if (name === 'exit_price' && numValue !== null) {
        newData.status = 'closed'
      }
      
      return newData
    })
  }

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, screenshot: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
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
              <label htmlFor="market" className="block text-sm font-medium text-gray-700">
                Market
              </label>
              <select
                name="market"
                id="market"
                value={formData.market}
                onChange={handleChange}
                className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              >
                <option value="US">US Stock</option>
                <option value="IN">Indian Stock (NSE)</option>
              </select>
            </div>

            <div>
              <label htmlFor="symbol" className="block text-sm font-medium text-gray-700">
                Symbol
              </label>
              <div className="mt-2 flex rounded-md shadow-sm">
                <input
                  type="text"
                  name="symbol"
                  id="symbol"
                  required
                  value={formData.symbol}
                  onChange={handleChange}
                  onBlur={loadChartData}
                  placeholder={formData.market === 'US' ? 'e.g., AAPL' : 'e.g., TATAMOTORS'}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                {formData.market === 'US' 
                  ? 'Enter US stock symbol (e.g., AAPL, MSFT, GOOGL)' 
                  : 'Enter NSE symbol (e.g., TATAMOTORS, RELIANCE, INFY)'}
              </p>
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
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <div className="mt-2">
                <div className="flex rounded-lg shadow-sm">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'open' }))}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-l-lg border ${
                      formData.status === 'open'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Open
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, status: 'closed' }))}
                    className={`flex-1 px-4 py-2 text-sm font-medium rounded-r-lg border -ml-px ${
                      formData.status === 'closed'
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    Closed
                  </button>
                </div>
              </div>
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
                Exit Date {formData.status === 'closed' && <span className="text-red-500">*</span>}
              </label>
              <input
                type="date"
                name="exit_date"
                id="exit_date"
                required={formData.status === 'closed'}
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

            {/* Strategy Field */}
            <div className="space-y-2">
              <label htmlFor="strategy" className="block text-sm font-medium text-gray-700">
                Strategy
              </label>
              <select
                id="strategy"
                name="strategy"
                value={formData.strategy}
                onChange={handleChange}
                className="block w-full rounded-lg border-gray-300 bg-white/50 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm transition-all duration-200"
                required
              >
                <option value="">Select a strategy</option>
                {strategies.map((strategy) => (
                  <option key={strategy} value={strategy}>
                    {strategy}
                  </option>
                ))}
              </select>
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

            {/* Position Size Calculator */}
            {formData.entry_price && formData.stop_loss && userSettings.totalCapital > 0 && (
              <div className="sm:col-span-2 bg-indigo-50/50 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-medium text-indigo-900">Position Size Calculator</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Risk Amount:</span>
                    <span className="ml-2 text-indigo-700 font-medium">${riskAmount?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Suggested Size:</span>
                    <span className="ml-2 text-indigo-700 font-medium">{suggestedSize || 0} shares</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Risk per Share:</span>
                    <span className="ml-2 text-indigo-700 font-medium">
                      ${Math.abs(formData.entry_price - formData.stop_loss).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-gray-600 mr-2">Account Risk:</span>
                    <input
                      type="number"
                      value={accountRisk}
                      onChange={(e) => {
                        const newRisk = parseFloat(e.target.value) || 0.1;
                        setAccountRisk(newRisk);
                      }}
                      onBlur={() => calculatePositionSize()}
                      min="0.1"
                      max="10"
                      step="0.1"
                      className="w-16 text-sm rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                    />
                    <span className="ml-1 text-gray-600">%</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, quantity: suggestedSize || 0 }))}
                  className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  disabled={!suggestedSize}
                >
                  Apply Suggested Size
                </button>
              </div>
            )}

            {/* Market Context */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="market_conditions" className="block text-sm font-medium text-gray-700">
                  Market Conditions
                </label>
                <select
                  name="market_conditions"
                  id="market_conditions"
                  value={formData.market_conditions || ''}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Condition</option>
                  <option value="bullish">Bullish</option>
                  <option value="bearish">Bearish</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>

              <div>
                <label htmlFor="trade_setup" className="block text-sm font-medium text-gray-700">
                  Trade Setup
                </label>
                <input
                  type="text"
                  name="trade_setup"
                  id="trade_setup"
                  placeholder="e.g., Break and Retest"
                  value={formData.trade_setup || ''}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              <div>
                <label htmlFor="emotional_state" className="block text-sm font-medium text-gray-700">
                  Emotional State
                </label>
                <select
                  name="emotional_state"
                  id="emotional_state"
                  value={formData.emotional_state || ''}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select State</option>
                  <option value="confident">Confident</option>
                  <option value="uncertain">Uncertain</option>
                  <option value="neutral">Neutral</option>
                </select>
              </div>
            </div>

            {/* Trade Analysis */}
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="proficiency" className="block text-sm font-medium text-gray-700">
                  Proficiency
                </label>
                <select
                  name="proficiency"
                  id="proficiency"
                  value={formData.proficiency || ''}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Proficiency</option>
                  <option value="Emotional Control">Emotional Control</option>
                  <option value="Exited in Strength">Exited in Strength</option>
                  <option value="Good Entry">Good Entry</option>
                  <option value="Good Trailing">Good Trailing</option>
                  <option value="Protected Breakeven">Protected Breakeven</option>
                  <option value="Small SL">Small SL</option>
                  <option value="Well Managed">Well Managed</option>
                  <option value="Good Entry">Good Entry</option>
                </select>
              </div>

              <div>
                <label htmlFor="growth_areas" className="block text-sm font-medium text-gray-700">
                  Growth Areas
                </label>
                <select
                  name="growth_areas"
                  id="growth_areas"
                  value={formData.growth_areas || ''}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Growth Area</option>
                  <option value="Biased Analysis">Biased Analysis</option>
                  <option value="Booked Early">Booked Early</option>
                  <option value="Didn't Book Loss">Didn't Book Loss</option>
                  <option value="Too Tight SL">Too Tight SL</option>
                  <option value="FOMO">FOMO</option>
                  <option value="Illiquid Stock">Illiquid Stock</option>
                  <option value="Illogical SL">Illogical SL</option>
                  <option value="Lack of Patience">Lack of Patience</option>
                  <option value="Late Entry">Late Entry</option>
                  <option value="Momentum-less stock">Momentum-less stock</option>
                  <option value="Overconfidence">Overconfidence</option>
                  <option value="Overtrading">Overtrading</option>
                  <option value="Poor Execution">Poor Execution</option>
                  <option value="Poor Exit">Poor Exit</option>
                  <option value="Poor Po Size">Poor Po Size</option>
                  <option value="Poor Sector">Poor Sector</option>
                  <option value="Poor Stock">Poor Stock</option>
                  <option value="Shifted SL Quickly">Shifted SL Quickly</option>
                  <option value="Too Early Entry">Too Early Entry</option>
                  <option value="Poor Execution">Poor Execution</option>
                  <option value="Booked Late">Booked Late</option>
                </select>
              </div>

              <div>
                <label htmlFor="exit_trigger" className="block text-sm font-medium text-gray-700">
                  Exit Trigger
                </label>
                <select
                  name="exit_trigger"
                  id="exit_trigger"
                  value={formData.exit_trigger || ''}
                  onChange={handleChange}
                  className="mt-2 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                >
                  <option value="">Select Exit Trigger</option>
                  <option value="Breakeven exit">Breakeven exit</option>
                  <option value="Market Pressure">Market Pressure</option>
                  <option value="R multiples">R multiples</option>
                  <option value="Random">Random</option>
                  <option value="Rejection">Rejection</option>
                  <option value="Setup Failed">Setup Failed</option>
                  <option value="SL">SL</option>
                  <option value="Target">Target</option>
                  <option value="Trailing SL">Trailing SL</option>
                </select>
              </div>
            </div>

            {/* Screenshot Upload */}
            <div className="sm:col-span-2">
              <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700">
                Chart Screenshot
              </label>
              <div className="mt-2">
                <input
                  type="file"
                  name="screenshot"
                  id="screenshot"
                  accept="image/*"
                  onChange={handleScreenshotChange}
                  className="block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-indigo-50 file:text-indigo-700
                    hover:file:bg-indigo-100
                    focus:outline-none"
                />
              </div>
            </div>

            {/* Notes Field */}
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

          {/* Chart Section - Moved down */}
          {formData.symbol && (
            <div className="border-t border-gray-200 pt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Trade Chart</h3>
              {chartError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-sm text-red-600">{chartError}</p>
                </div>
              ) : candleData.length > 0 ? (
                <TradeChart trade={formData as Trade} candleData={candleData} />
              ) : (
                <div className="flex justify-center items-center h-64 bg-gray-50 rounded-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                </div>
              )}
            </div>
          )}

          {/* AI Analysis Section */}
          {formData.status === 'closed' && (
            <div className="sm:col-span-2 border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">AI Trade Analysis</h3>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setLoading(true);
                      const feedback = await generateTradeFeedback(formData as Trade);
                      const updatedFormData = {
                        ...formData,
                        ai_feedback_performance: feedback.performance,
                        ai_feedback_lessons: feedback.lessons,
                        ai_feedback_mistakes: feedback.mistakes,
                        ai_feedback_generated_at: new Date().toISOString()
                      };
                      
                      // Save the feedback to the database if we're editing an existing trade
                      if (id) {
                        const now = new Date().toISOString();
                        await db.updateTrade({
                          ...updatedFormData,
                          id,
                          created_at: now,
                          updated_at: now
                        });
                        setSuccess('AI analysis saved successfully');
                      }
                      
                      setFormData(updatedFormData);
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Failed to generate AI feedback');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Analyzing...
                    </span>
                  ) : formData.ai_feedback_generated_at ? 'Regenerate Analysis' : 'Generate Analysis'}
                </button>
              </div>

              {/* Success message */}
              {success && (
                <div className="mb-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-600">{success}</p>
                </div>
              )}

              {formData.ai_feedback_performance && (
                <div className="space-y-6 bg-white/50 rounded-lg p-6">
                  <div>
                    <h4 className="text-sm font-medium text-indigo-600 mb-2">Performance Analysis</h4>
                    <div className="space-y-2 text-sm text-gray-900">
                      {formData.ai_feedback_performance.split('\n').map((point, index) => (
                        <div key={index} className="flex items-start">
                          <span className="text-indigo-500 mr-2">•</span>
                          <p>{point.replace(/^[•-]\s*/, '')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {formData.ai_feedback_lessons && (
                    <div>
                      <h4 className="text-sm font-medium text-green-600 mb-2">What Worked Well</h4>
                      <div className="space-y-2 text-sm text-gray-900">
                        {formData.ai_feedback_lessons.split('\n').map((point, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-green-500 mr-2">•</span>
                            <p>{point.replace(/^[•-]\s*/, '')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {formData.ai_feedback_mistakes && (
                    <div>
                      <h4 className="text-sm font-medium text-orange-600 mb-2">Areas to Improve</h4>
                      <div className="space-y-2 text-sm text-gray-900">
                        {formData.ai_feedback_mistakes.split('\n').map((point, index) => (
                          <div key={index} className="flex items-start">
                            <span className="text-orange-500 mr-2">•</span>
                            <p>{point.replace(/^[•-]\s*/, '')}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {formData.ai_feedback_generated_at && (
                    <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-500">
                      Last analyzed on {new Date(formData.ai_feedback_generated_at).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

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