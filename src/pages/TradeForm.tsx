import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { db } from '../services/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Trade, TradeFormData, TradeBase } from '../../types/trade'
import { generateTradeFeedback } from '../services/openai'
import TradeChart from '../components/TradeChart'
import { fetchHistoricalData, getChartDateRange, CandleData } from '../services/marketData'
import TradeExits from '../components/TradeExits'

function TradeForm() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [formData, setFormData] = useState<TradeFormData>({
    symbol: '',
    type: 'long',
    entry_date: new Date().toISOString().split('T')[0],
    entry_price: null,
    quantity: 0,
    remaining_quantity: null,
    average_exit_price: null,
    exit_date: null,
    exit_price: null,
    fees: 0,
    strategy: '',
    notes: '',
    status: 'open',
    market: 'US',
    stop_loss: null,
    take_profit: null,
    screenshot: null,
    market_conditions: null,
    emotional_state: null,
    trade_setup: null,
    proficiency: null,
    growth_areas: null,
    exit_trigger: null,
    ai_feedback_performance: null,
    ai_feedback_lessons: null,
    ai_feedback_mistakes: null,
    ai_feedback_generated_at: null,
    user_id: ''
  })
  const [tradeData, setTradeData] = useState<Trade | null>(null)
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
  }, [formData.symbol, formData.entry_date, formData.market]);

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
      
      // Ensure trade.exits is always an array
      const tradeWithExits = {
        ...trade,
        exits: trade.exits || []
      }
      setTradeData(tradeWithExits)
      
      setFormData({
        symbol: trade.symbol,
        type: trade.type,
        entry_date: trade.entry_date.split('T')[0],
        entry_price: trade.entry_price,
        quantity: trade.quantity,
        remaining_quantity: trade.remaining_quantity || null,
        average_exit_price: trade.average_exit_price || null,
        exit_date: trade.exit_date,
        exit_price: trade.exit_price,
        strategy: trade.strategy || '',
        notes: trade.notes || '',
        fees: trade.fees || 0,
        stop_loss: trade.stop_loss || null,
        take_profit: trade.take_profit || null,
        screenshot: trade.screenshot || null,
        status: trade.status,
        user_id: trade.user_id,
        market_conditions: trade.market_conditions || null,
        emotional_state: trade.emotional_state || null,
        trade_setup: trade.trade_setup || null,
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
        null // No exit date in form data
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
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      if (!formData.entry_price) {
        throw new Error('Entry price is required');
      }

      // Prepare base data without exits field
      const baseData: TradeBase = {
        symbol: formData.symbol,
        type: formData.type,
        entry_date: new Date(formData.entry_date).toISOString(),
        entry_price: formData.entry_price,
        quantity: formData.quantity,
        remaining_quantity: formData.quantity,
        average_exit_price: null,
        exit_date: formData.exit_date,
        exit_price: formData.exit_price,
        strategy: formData.strategy || '',
        notes: formData.notes || '',
        fees: formData.fees,
        stop_loss: formData.stop_loss,
        take_profit: formData.take_profit,
        screenshot: formData.screenshot,
        status: formData.status,
        user_id: user?.id || '',
        market_conditions: formData.market_conditions,
        emotional_state: formData.emotional_state,
        trade_setup: formData.trade_setup,
        proficiency: formData.proficiency,
        growth_areas: formData.growth_areas,
        exit_trigger: formData.exit_trigger,
        ai_feedback_performance: formData.ai_feedback_performance,
        ai_feedback_lessons: formData.ai_feedback_lessons,
        ai_feedback_mistakes: formData.ai_feedback_mistakes,
        ai_feedback_generated_at: formData.ai_feedback_generated_at,
        market: formData.market
      };

      if (id) {
        // For updates, include the id and timestamps
        const now = new Date().toISOString();
        await db.updateTrade({
          ...baseData,
          id,
          created_at: now,
          updated_at: now
        });
        setSuccess('Trade updated successfully');
      } else {
        // For new trades
        await db.addTrade(baseData);
        setSuccess('Trade created successfully');
      }
      setTimeout(() => navigate('/trades'), 1500);
    } catch (err) {
      console.error('Error saving trade:', err);
      setError(err instanceof Error ? err.message : 'Failed to save trade');
    } finally {
      setLoading(false);
    }
  };

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
        {/* Header with Trade Type Badge */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {id ? 'Edit Trade' : 'New Trade'}
            </h1>
            {formData.type && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                formData.type === 'long'
                  ? 'bg-green-100 text-green-800 border border-green-200'
                  : 'bg-red-100 text-red-800 border border-red-200'
              }`}>
                {formData.type.toUpperCase()}
              </span>
            )}
          </div>
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Trade Setup Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Trade Setup
            </h2>
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
            </div>
          </div>

          {/* Entry Details Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Entry Details
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                    value={formData.entry_price ?? ''}
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
                  value={formData.quantity || ''}
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
            </div>
          </div>

          {/* Risk Management Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              Risk Management
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
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
                    value={formData.stop_loss ?? ''}
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
                    value={formData.take_profit ?? ''}
                    onChange={handleChange}
                    className="pl-7 block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>
              </div>

              {/* Visual Risk/Reward Ratio */}
              {formData.entry_price && formData.stop_loss && formData.take_profit && (
                <div className="sm:col-span-2 bg-gray-50 rounded-xl p-6">
                  <h3 className="text-sm font-medium text-gray-900 mb-4">Risk/Reward Ratio</h3>
                  <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden">
                    {(() => {
                      const risk = Math.abs(formData.entry_price - formData.stop_loss);
                      const reward = Math.abs(formData.take_profit - formData.entry_price);
                      const total = risk + reward;
                      const riskPercent = (risk / total) * 100;
                      const rewardPercent = (reward / total) * 100;
                      return (
                        <>
                          <div 
                            className="absolute left-0 h-full bg-red-500 transition-all duration-300"
                            style={{ width: `${riskPercent}%` }}
                          />
                          <div 
                            className="absolute right-0 h-full bg-green-500 transition-all duration-300"
                            style={{ width: `${rewardPercent}%` }}
                          />
                        </>
                      );
                    })()}
                  </div>
                  <div className="flex justify-between mt-2 text-sm">
                    <span className="text-red-600 font-medium">
                      Risk: ${Math.abs(formData.entry_price - formData.stop_loss).toFixed(2)}
                    </span>
                    <span className="text-green-600 font-medium">
                      Reward: ${Math.abs(formData.take_profit - formData.entry_price).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Enhanced Position Size Calculator */}
              {formData.entry_price && formData.stop_loss && userSettings.totalCapital > 0 && (
                <div className="sm:col-span-2 bg-indigo-50 rounded-xl p-6">
                  <h3 className="text-lg font-medium text-indigo-900 mb-4">Position Size Calculator</h3>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Risk Amount</div>
                      <div className="text-2xl font-semibold text-indigo-700">
                        ${riskAmount?.toFixed(2) || '0.00'}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {((riskAmount || 0) / userSettings.totalCapital * 100).toFixed(2)}% of capital
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Suggested Size</div>
                      <div className="text-2xl font-semibold text-indigo-700">
                        {suggestedSize || 0}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">shares</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Risk per Share</div>
                      <div className="text-2xl font-semibold text-indigo-700">
                        ${Math.abs(formData.entry_price - formData.stop_loss).toFixed(2)}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-4 shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Account Risk</div>
                      <div className="flex items-center">
                        <input
                          type="number"
                          value={accountRisk}
                          onChange={(e) => {
                            const newRisk = parseFloat(e.target.value) || 0.1;
                            setAccountRisk(newRisk);
                          }}
                          onBlur={() => calculatePositionSize()}
                          className="w-20 text-2xl font-semibold text-indigo-700 border-0 focus:ring-0 p-0"
                        />
                        <span className="text-2xl font-semibold text-indigo-700 ml-1">%</span>
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, quantity: suggestedSize || 0 }))}
                    className="mt-4 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors duration-200"
                    disabled={!suggestedSize}
                  >
                    Apply Suggested Size
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Trade Context Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Trade Context
            </h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
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
                  <option value="Emotional Control">Emotional Control</option>
                  <option value="Entry Timing">Entry Timing</option>
                  <option value="Exit Timing">Exit Timing</option>
                  <option value="Position Sizing">Position Sizing</option>
                  <option value="Risk Management">Risk Management</option>
                  <option value="Stop Loss Placement">Stop Loss Placement</option>
                  <option value="Take Profit Placement">Take Profit Placement</option>
                  <option value="Trade Management">Trade Management</option>
                </select>
              </div>
            </div>
          </div>

          {/* Screenshot and Notes Card */}
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Documentation
            </h2>
            <div className="space-y-6">
              {/* Screenshot preview */}
              <div>
                <label htmlFor="screenshot" className="block text-sm font-medium text-gray-700 mb-2">
                  Chart Screenshot
                </label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-indigo-500 transition-colors duration-200">
                  <div className="space-y-1 text-center">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="flex text-sm text-gray-600">
                      <label htmlFor="screenshot" className="relative cursor-pointer bg-white rounded-md font-medium text-indigo-600 hover:text-indigo-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-indigo-500">
                        <span>Upload a file</span>
                        <input
                          id="screenshot"
                          name="screenshot"
                          type="file"
                          accept="image/*"
                          onChange={handleScreenshotChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
                {formData.screenshot && (
                  <div className="mt-4">
                    <img
                      src={formData.screenshot}
                      alt="Trade screenshot"
                      className="max-h-96 rounded-lg mx-auto"
                    />
                  </div>
                )}
              </div>

              {/* Notes field */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  id="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleChange}
                  className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  placeholder="Add your trade notes, observations, and learnings here..."
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/trades')}
              className="px-6 py-3 border border-gray-300 text-sm font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
            >
              {loading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {id ? 'Updating...' : 'Creating...'}
                </span>
              ) : (
                id ? 'Update Trade' : 'Create Trade'
              )}
            </button>
          </div>
        </form>

        {/* Rest of the components (Chart, AI Analysis, Trade Exits) */}
        {formData.symbol && formData.status === 'closed' && (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/20 mt-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <svg className="w-6 h-6 mr-2 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              Trade Chart
            </h3>
            {chartError ? (
              <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{chartError}</p>
                  </div>
                </div>
              </div>
            ) : candleData.length > 0 ? (
              <div className="bg-gray-900 rounded-xl p-4">
                <TradeChart 
                  trade={{
                    ...formData,
                    id: id || '',
                    entry_price: formData.entry_price || 0,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    exits: []
                  }} 
                  candleData={candleData} 
                />
              </div>
            ) : (
              <div className="flex justify-center items-center h-64 bg-gray-50 rounded-xl">
                <div className="flex flex-col items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-4"></div>
                  <p className="text-gray-500">Loading chart data...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {formData.status === 'closed' && (
          <div className="sm:col-span-2 border-t border-gray-200 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">AI Trade Analysis</h3>
              <button
                type="button"
                onClick={async () => {
                  try {
                    setLoading(true);
                    const feedback = await generateTradeFeedback({
                      ...formData,
                      id: id || '',
                      entry_price: formData.entry_price || 0,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                      exits: []
                    });
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
                      const dbData: TradeBase = {
                        ...updatedFormData,
                        entry_price: updatedFormData.entry_price || 0,
                        strategy: updatedFormData.strategy || '',
                        notes: updatedFormData.notes || ''
                      };
                      await db.updateTrade({
                        ...dbData,
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
      </div>

      {id && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/20">
            <TradeExits
              trade={{
                ...formData,
                id,
                entry_price: formData.entry_price || 0,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                exits: tradeData?.exits || []
              }}
              onExitAdded={() => loadTrade()}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default TradeForm 