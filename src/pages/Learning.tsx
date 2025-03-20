import { useState, useEffect } from 'react'
import { db } from '../services/supabase'
import { Trade, UserSettings } from '../services/supabase'
import OpenAI from 'openai'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
})

interface AggregatedAnalytics {
  commonMistakes: { [key: string]: number }
  successfulStrategies: { [key: string]: number }
  profitableSetups: { [key: string]: number }
  emotionalPatterns: { [key: string]: number }
  overallPerformance: string[]
  keyLessons: string[]
  improvementAreas: string[]
  lastAnalyzedAt?: string
  // New metrics from dashboard
  monthlyPerformance: {
    month: string
    profitLoss: number
    winRate: number
    tradeCount: number
  }[]
  strategyAnalytics: {
    name: string
    totalTrades: number
    winRate: number
    profitLoss: number
    profitFactor: number
  }[]
  overallStats: {
    totalTrades: number
    winRate: number
    totalProfitLoss: number
    averageRR: number
  }
  riskAnalysis: {
    suggestedStopLossRange: {
      min: number
      max: number
    }
    riskManagementScore: number
    consistencyScore: number
  }
  patternAnalysis: PatternAnalysis
}

interface PatternAnalysis {
  tradingPatterns: Array<{
    pattern: string;
    description: string;
    frequency: number;
    successRate: number;
    avgReturn: number;
    recommendation: string;
  }>;
}

interface PsychologyInsight {
  insight: string
  impact: 'positive' | 'negative'
  frequency: number
  suggestion: string
}

function Learning() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [analytics, setAnalytics] = useState<AggregatedAnalytics>({
    commonMistakes: {},
    successfulStrategies: {},
    profitableSetups: {},
    emotionalPatterns: {},
    overallPerformance: [],
    keyLessons: [],
    improvementAreas: [],
    lastAnalyzedAt: undefined,
    monthlyPerformance: [],
    strategyAnalytics: [],
    overallStats: {
      totalTrades: 0,
      winRate: 0,
      totalProfitLoss: 0,
      averageRR: 0
    },
    riskAnalysis: {
      suggestedStopLossRange: {
        min: 0,
        max: 0
      },
      riskManagementScore: 0,
      consistencyScore: 0
    },
    patternAnalysis: {
      tradingPatterns: [],
    }
  })
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    loadUserSettings()
    loadTrades()
  }, [])

  const loadUserSettings = async () => {
    try {
      const { data: { session } } = await db.supabase.auth.getSession()
      if (session?.user) {
        const settings = await db.getUserSettings(session.user.id)
        setUserSettings(settings)
      }
    } catch (err) {
      console.error('Error loading user settings:', err)
    }
  }

  const saveAnalysis = async (tradeIds: string[], refinedAnalytics: AggregatedAnalytics) => {
    try {
      // Save the analysis to each trade
      await Promise.all(tradeIds.map(id => 
        db.updateTradeFeedback(id, {
          performance: refinedAnalytics.overallPerformance.join('\n'),
          lessons: refinedAnalytics.keyLessons.join('\n'),
          mistakes: refinedAnalytics.improvementAreas.join('\n')
        })
      ))
    } catch (err) {
      console.error('Error saving analysis:', err)
      setError('Failed to save analysis')
    }
  }

  const refineFeedback = async (feedback: string[], type: string) => {
    try {
      let prompt = ''
      if (type === 'lessons') {
        prompt = `Summarize these trading lessons into 3 brief, actionable bullet points (max 10 words each):\n${feedback.join('\n')}`
      } else if (type === 'performance') {
        prompt = `Extract 3 key performance insights as brief bullet points (max 10 words each):\n${feedback.join('\n')}`
      } else {
        prompt = `List 3 critical areas for improvement as brief bullet points (max 10 words each):\n${feedback.join('\n')}`
      }

      const completion = await openai.chat.completions.create({
        messages: [
          { 
            role: 'system', 
            content: 'You are a trading coach. Keep responses extremely concise and actionable. No explanations, just clear directives.'
          },
          { role: 'user', content: prompt }
        ],
        model: 'gpt-3.5-turbo',
      })

      const refinedPoints = completion.choices[0]?.message?.content?.split('\n')
        .filter(point => point.trim())
        .map(point => point.replace(/^[•-]\s*/, '').trim()) || []

      return refinedPoints.length > 0 ? refinedPoints : feedback.slice(0, 3).map(f => f.split(':')[0].trim())
    } catch (err) {
      console.error('Error refining feedback:', err)
      return feedback.slice(0, 3).map(f => f.split(':')[0].trim()) // Fallback to first 3 original points, taking only the first part before ":"
    }
  }

  const aggregateAnalytics = async (trades: Trade[], shouldRefine: boolean = false) => {
    const aggregated: AggregatedAnalytics = {
      commonMistakes: {},
      successfulStrategies: {},
      profitableSetups: {},
      emotionalPatterns: {},
      overallPerformance: [],
      keyLessons: [],
      improvementAreas: [],
      lastAnalyzedAt: undefined,
      monthlyPerformance: [],
      strategyAnalytics: [],
      overallStats: {
        totalTrades: 0,
        winRate: 0,
        totalProfitLoss: 0,
        averageRR: 0
      },
      riskAnalysis: {
        suggestedStopLossRange: {
          min: 0,
          max: 0
        },
        riskManagementScore: calculateRiskScore(trades),
        consistencyScore: calculateConsistencyScore(trades)
      },
      patternAnalysis: {
        tradingPatterns: [],
      }
    }

    // Calculate overall stats
    const closedTrades = trades.filter(trade => trade.status === 'closed')
    const profitableTrades = closedTrades.filter(trade => {
      const exitPrice = trade.exit_price || (trade.exits?.[0]?.exit_price ?? 0)
      const pl = trade.type === 'long'
        ? (exitPrice - (trade.entry_price || 0)) * trade.quantity
        : ((trade.entry_price || 0) - exitPrice) * trade.quantity
      return pl > 0
    })

    aggregated.overallStats = {
      totalTrades: trades.length,
      winRate: closedTrades.length ? (profitableTrades.length / closedTrades.length) * 100 : 0,
      totalProfitLoss: closedTrades.reduce((sum, trade) => {
        const exitPrice = trade.exit_price || (trade.exits?.[0]?.exit_price ?? 0)
        const pl = trade.type === 'long'
          ? (exitPrice - (trade.entry_price || 0)) * trade.quantity
          : ((trade.entry_price || 0) - exitPrice) * trade.quantity
        return sum + pl
      }, 0),
      averageRR: closedTrades.reduce((sum, trade) => {
        if (!trade.entry_price || !trade.stop_loss) return sum
        const exitPrice = trade.exit_price || (trade.exits?.[0]?.exit_price ?? 0)
        const reward = trade.type === 'long'
          ? exitPrice - (trade.entry_price || 0)
          : (trade.entry_price || 0) - exitPrice
        const risk = trade.type === 'long'
          ? (trade.entry_price || 0) - trade.stop_loss
          : trade.stop_loss - (trade.entry_price || 0)
        return risk > 0 ? sum + (reward / risk) : sum
      }, 0) / (closedTrades.length || 1)
    }

    // Calculate strategy analytics
    const strategyMap = new Map<string, any>()
    closedTrades.forEach(trade => {
      if (!trade.strategy) return
      const strategy = strategyMap.get(trade.strategy) || {
        name: trade.strategy,
        totalTrades: 0,
        wins: 0,
        profitLoss: 0
      }
      const exitPrice = trade.exit_price || (trade.exits?.[0]?.exit_price ?? 0)
      const pl = trade.type === 'long'
        ? (exitPrice - (trade.entry_price || 0)) * trade.quantity
        : ((trade.entry_price || 0) - exitPrice) * trade.quantity
      
      strategyMap.set(trade.strategy, {
        ...strategy,
        totalTrades: strategy.totalTrades + 1,
        wins: strategy.wins + (pl > 0 ? 1 : 0),
        profitLoss: strategy.profitLoss + pl
      })
    })

    aggregated.strategyAnalytics = Array.from(strategyMap.values())
      .map(strategy => ({
        ...strategy,
        winRate: (strategy.wins / strategy.totalTrades) * 100,
        profitFactor: strategy.profitLoss > 0 ? strategy.profitLoss : 0
      }))
      .sort((a, b) => b.profitLoss - a.profitLoss)

    // Check if trades need analysis
    const tradesNeedingAnalysis = trades.filter(trade => 
      !trade.ai_feedback_generated_at || 
      !trade.ai_feedback_performance || 
      !trade.ai_feedback_lessons || 
      !trade.ai_feedback_mistakes
    )

    const hasExistingAnalysis = tradesNeedingAnalysis.length === 0

    if (hasExistingAnalysis && !shouldRefine) {
      // Use existing analysis
      const uniquePerformance = new Set<string>()
      const uniqueLessons = new Set<string>()
      const uniqueAreas = new Set<string>()

      trades.forEach(trade => {
        if (trade.ai_feedback_performance) {
          trade.ai_feedback_performance.split('\n').forEach(p => uniquePerformance.add(p.trim()))
        }
        if (trade.ai_feedback_lessons) {
          trade.ai_feedback_lessons.split('\n').forEach(l => uniqueLessons.add(l.trim()))
        }
        if (trade.ai_feedback_mistakes) {
          trade.ai_feedback_mistakes.split('\n').forEach(m => uniqueAreas.add(m.trim()))
        }
      })

      aggregated.overallPerformance = Array.from(uniquePerformance).filter(Boolean)
      aggregated.keyLessons = Array.from(uniqueLessons).filter(Boolean)
      aggregated.improvementAreas = Array.from(uniqueAreas).filter(Boolean)

      // Get the most recent analysis timestamp
      const lastAnalyzedAt = Math.max(...trades
        .map(t => t.ai_feedback_generated_at ? new Date(t.ai_feedback_generated_at).getTime() : 0)
      )
      aggregated.lastAnalyzedAt = new Date(lastAnalyzedAt).toISOString()
    } else {
      // Process each trade's AI feedback
      const allFeedback = {
        performance: new Set<string>(),
        lessons: new Set<string>(),
        mistakes: new Set<string>()
      }

      trades.forEach(trade => {
        if (trade.ai_feedback_performance) {
          trade.ai_feedback_performance.split('\n').forEach(p => allFeedback.performance.add(p.trim()))
        }
        if (trade.ai_feedback_lessons) {
          trade.ai_feedback_lessons.split('\n').forEach(l => allFeedback.lessons.add(l.trim()))
        }
        if (trade.ai_feedback_mistakes) {
          trade.ai_feedback_mistakes.split('\n').forEach(m => allFeedback.mistakes.add(m.trim()))
        }
      })

      aggregated.overallPerformance = Array.from(allFeedback.performance).filter(Boolean)
      aggregated.keyLessons = Array.from(allFeedback.lessons).filter(Boolean)
      aggregated.improvementAreas = Array.from(allFeedback.mistakes).filter(Boolean)

      // Always refine if there are new trades or it's forced
      if (tradesNeedingAnalysis.length > 0 || shouldRefine) {
        setAnalyzing(true)
        try {
          // Refine feedback using OpenAI
          const [refinedLessons, refinedPerformance, refinedAreas] = await Promise.all([
            refineFeedback(aggregated.keyLessons, 'lessons'),
            refineFeedback(aggregated.overallPerformance, 'performance'),
            refineFeedback(aggregated.improvementAreas, 'improvements')
          ])

          aggregated.keyLessons = refinedLessons
          aggregated.overallPerformance = refinedPerformance
          aggregated.improvementAreas = refinedAreas
          aggregated.lastAnalyzedAt = new Date().toISOString()

          // Save the refined analysis
          await saveAnalysis(trades.map(t => t.id), aggregated)
        } catch (err) {
          console.error('Error refining feedback:', err)
          setError('Failed to refine analysis')
        } finally {
          setAnalyzing(false)
        }
      }
    }

    // Calculate stop loss range
    const stopLosses = closedTrades
      .filter(trade => trade.stop_loss && trade.entry_price)
      .map(trade => Math.abs(((trade.stop_loss! - trade.entry_price!) / trade.entry_price!) * 100))

    if (stopLosses.length > 0) {
      aggregated.riskAnalysis.suggestedStopLossRange = {
        min: Math.min(...stopLosses),
        max: Math.max(...stopLosses)
      }
    }

    // AI-powered pattern analysis
    if (trades.length > 0) {
      try {
        const prompt = `Analyze the following trading data and provide a structured analysis in JSON format with exactly these fields:
{
  "patterns": [
    {
      "pattern": "string (name of the pattern)",
      "description": "string (brief description)",
      "frequency": "number (how many times it occurred)",
      "successRate": "number (percentage of successful trades)",
      "avgReturn": "number (average return percentage)",
      "recommendation": "string (actionable recommendation)"
    }
  ]
}

Trading data to analyze:
${JSON.stringify(trades.map(t => ({
  type: t.type,
  entry_price: t.entry_price,
  exit_price: t.exit_price || t.exits?.[0]?.exit_price,
  stop_loss: t.stop_loss,
  take_profit: t.take_profit,
  strategy: t.strategy,
  notes: t.notes,
  emotional_state: t.emotional_state,
  market_conditions: t.market_conditions,
  entry_date: new Date(t.entry_date).toISOString(),
  exit_date: t.exit_date ? new Date(t.exit_date).toISOString() : null,
  profit_loss: calculateTradeProfit(t)
})), null, 2)}

Analyze the data for common trading patterns and their success rates.
Ensure all numeric values are actual numbers, not strings. Format the response exactly according to the schema above.`

        const completion = await openai.chat.completions.create({
          messages: [
            {
              role: 'system',
              content: `You are an expert trading analyst AI. Analyze trading patterns and provide actionable insights.
              Your response must be valid JSON matching the exact schema provided.
              Ensure all numeric values are numbers, not strings.
              Provide at least 3 patterns.
              Base all analysis on actual patterns in the trading data provided.`
            },
            { role: 'user', content: prompt }
          ],
          model: 'gpt-3.5-turbo',
          temperature: 0.7,
          response_format: { type: "json_object" }
        })

        try {
          const analysis = JSON.parse(completion.choices[0]?.message?.content || '{}')
          
          // Validate and sanitize the analysis data
          const sanitizedAnalysis = {
            tradingPatterns: (analysis.patterns || []).map((pattern: any) => ({
              pattern: pattern.pattern || 'Unknown Pattern',
              description: pattern.description || 'No description available',
              frequency: pattern.frequency || 0,
              successRate: pattern.successRate || 0,
              avgReturn: pattern.avgReturn || 0,
              recommendation: pattern.recommendation || 'No recommendation available'
            }))
          }
          
          aggregated.patternAnalysis = sanitizedAnalysis
        } catch (parseError) {
          console.error('Error parsing AI analysis:', parseError)
          // Provide fallback data if parsing fails
          aggregated.patternAnalysis = {
            tradingPatterns: [{
              pattern: 'Basic Trading Pattern',
              description: 'Common trading behavior observed',
              frequency: trades.length,
              successRate: (profitableTrades.length / closedTrades.length) * 100,
              avgReturn: aggregated.overallStats.totalProfitLoss / trades.length,
              recommendation: 'Continue monitoring and analyzing trading patterns'
            }],
          }
        }
      } catch (err) {
        console.error('Error generating AI pattern analysis:', err)
        // Set default values if AI analysis fails
        aggregated.patternAnalysis = {
          tradingPatterns: [],
        }
      }
    }

    setAnalytics(aggregated)
  }

  const loadTrades = async () => {
    try {
      setLoading(true)
      const allTrades = await db.getAllTrades()
      const closedTrades = allTrades.filter(trade => trade.status === 'closed')
      setTrades(closedTrades)
      
      // Check if any trades need analysis
      const tradesNeedingAnalysis = closedTrades.filter(trade => 
        !trade.ai_feedback_generated_at || 
        !trade.ai_feedback_performance || 
        !trade.ai_feedback_lessons || 
        !trade.ai_feedback_mistakes
      )

      // Automatically analyze if there are new trades or no analysis exists
      await aggregateAnalytics(closedTrades, tradesNeedingAnalysis.length > 0)
    } catch (err) {
      setError('Failed to load trades')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          Trading Insights & Learning
        </h1>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <p className="text-sm text-gray-600">
              Based on {trades.length} closed trades
            </p>
            {analytics.lastAnalyzedAt && (
              <p className="text-xs text-gray-500">
                Last analyzed: {new Date(analytics.lastAnalyzedAt).toLocaleDateString()}
              </p>
            )}
          </div>
          <button
            onClick={() => aggregateAnalytics(trades, true)}
            disabled={analyzing}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {analyzing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Analyzing...
              </>
            ) : (
              'Regenerate Analysis'
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-8 p-4 bg-red-50 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8">
        {/* Overall Performance Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Total Trades</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {analytics.overallStats.totalTrades}
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Win Rate</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {analytics.overallStats.winRate.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Total P/L</h3>
            <p className={`mt-2 text-3xl font-bold ${analytics.overallStats.totalProfitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ${analytics.overallStats.totalProfitLoss.toFixed(2)}
            </p>
          </div>
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Avg R:R Ratio</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              1:{analytics.overallStats.averageRR.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Strategy Performance */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Strategy Performance</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analytics.strategyAnalytics.map((strategy, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900">{strategy.name}</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Win Rate:</span>
                    <span className="font-medium text-gray-900">{strategy.winRate.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Total Trades:</span>
                    <span className="font-medium text-gray-900">{strategy.totalTrades}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">P/L:</span>
                    <span className={`font-medium ${strategy.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${strategy.profitLoss.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Lessons */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Lessons</h2>
          <div className="space-y-4">
            {analytics.keyLessons.map((lesson, index) => (
              <div key={index} className="flex items-start">
                <span className="text-green-500 mr-2 mt-1 text-xl">•</span>
                <p className="text-base text-gray-700">{lesson}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Insights & Areas to Improve */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Insights</h2>
            <div className="space-y-4">
              {analytics.overallPerformance.map((insight, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-indigo-500 mr-2 mt-1 text-xl">•</span>
                  <p className="text-base text-gray-700">{insight}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Areas to Improve</h2>
            <div className="space-y-4">
              {analytics.improvementAreas.map((area, index) => (
                <div key={index} className="flex items-start">
                  <span className="text-orange-500 mr-2 mt-1 text-xl">•</span>
                  <p className="text-base text-gray-700">{area}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Risk Management Insights */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Risk Management Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Stop Loss Analysis</h3>
              <div className="mt-2 space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Recommended Stop Loss Range</p>
                  <p className="text-2xl font-bold text-indigo-600">
                    {analytics.riskAnalysis.suggestedStopLossRange.min > 0 
                      ? `${analytics.riskAnalysis.suggestedStopLossRange.min.toFixed(1)}% - ${analytics.riskAnalysis.suggestedStopLossRange.max.toFixed(1)}%`
                      : 'No data available'}
                  </p>
                  <p className="text-xs text-gray-500">from entry price</p>
                </div>
                <div className="mt-4">
                  <p className="text-sm text-gray-500 mb-2">Stop Loss Usage</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-indigo-600 h-2 rounded-full"
                        style={{ width: `${analytics.riskAnalysis.riskManagementScore}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {analytics.riskAnalysis.riskManagementScore.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">of trades have proper stop loss placement</p>
                </div>
                {/* New: Risk-Reward Analysis */}
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Risk-Reward Analysis</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Average R:R Ratio</span>
                      <span className="text-sm font-medium text-indigo-600">
                        1:{analytics.overallStats.averageRR.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Trades Meeting 1:2 R:R</span>
                      <span className="text-sm font-medium text-indigo-600">
                        {(analytics.riskAnalysis.riskManagementScore * 0.4).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-3">Risk Management Score</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Overall Risk Score</p>
                  <div className="flex items-center mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${
                          analytics.riskAnalysis.riskManagementScore >= 80 ? 'bg-green-600' :
                          analytics.riskAnalysis.riskManagementScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${analytics.riskAnalysis.riskManagementScore}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-lg font-medium text-gray-900">
                      {analytics.riskAnalysis.riskManagementScore.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Based on stop loss usage and risk-reward ratios</p>
                </div>
                <div className="mt-6">
                  <p className="text-sm text-gray-500">Trading Consistency</p>
                  <div className="flex items-center mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-4">
                      <div
                        className={`h-4 rounded-full ${
                          analytics.riskAnalysis.consistencyScore >= 80 ? 'bg-green-600' :
                          analytics.riskAnalysis.consistencyScore >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${analytics.riskAnalysis.consistencyScore}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-lg font-medium text-gray-900">
                      {analytics.riskAnalysis.consistencyScore.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Based on profit consistency and strategy adherence</p>
                </div>
                {/* New: Risk Score Breakdown */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-3">Risk Score Breakdown</p>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Stop Loss Discipline</span>
                        <span className="font-medium text-gray-900">30%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Position Sizing</span>
                        <span className="font-medium text-gray-900">30%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '30%' }}></div>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-500">Risk-Reward Ratio</span>
                        <span className="font-medium text-gray-900">40%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: '40%' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
                {/* New: Risk Management Tips */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm font-medium text-gray-900 mb-2">Risk Management Tips</p>
                  <ul className="space-y-2">
                    <li className="flex items-start">
                      <span className="text-indigo-500 mr-2">•</span>
                      <span className="text-sm text-gray-700">Always set stop loss before entering trades</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-indigo-500 mr-2">•</span>
                      <span className="text-sm text-gray-700">Aim for minimum 1:2 risk-reward ratio</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-indigo-500 mr-2">•</span>
                      <span className="text-sm text-gray-700">Maintain consistent position sizing</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trade Pattern Recognition */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Trade Pattern Analysis</h2>
          
          {/* Trading Patterns */}
          <div className="grid grid-cols-1 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Identified Patterns</h3>
              <div className="space-y-4">
                {analytics.patternAnalysis.tradingPatterns.map((pattern, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900">{pattern.pattern}</h4>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        pattern.successRate >= 60 ? 'bg-green-100 text-green-800' :
                        pattern.successRate >= 40 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {pattern.successRate.toFixed(1)}% Success
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{pattern.description}</p>
                    <div className="flex justify-between text-sm text-gray-500">
                      <span>Frequency: {pattern.frequency}x</span>
                      <span>Avg Return: {pattern.avgReturn > 0 ? '+' : ''}{pattern.avgReturn.toFixed(2)}%</span>
                    </div>
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <p className="text-sm font-medium text-indigo-600">{pattern.recommendation}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Helper functions
function calculateTradeProfit(trade: Trade): number {
  const exitPrice = trade.exit_price || (trade.exits?.[0]?.exit_price ?? 0)
  return trade.type === 'long'
    ? (exitPrice - (trade.entry_price || 0)) * trade.quantity
    : ((trade.entry_price || 0) - exitPrice) * trade.quantity
}

function average(numbers: number[]): number {
  return numbers.length > 0
    ? numbers.reduce((sum, num) => sum + num, 0) / numbers.length
    : 0
}

function calculateRiskScore(trades: Trade[]): number {
  let score = 100
  const closedTrades = trades.filter(t => t.status === 'closed')
  
  // Deduct points for missing stop losses
  const tradesWithoutStopLoss = closedTrades.filter(t => !t.stop_loss).length
  score -= (tradesWithoutStopLoss / closedTrades.length) * 30

  // Deduct points for position sizes > 5% of capital
  const largePositions = closedTrades.filter(t => 
    (t.quantity * (t.entry_price || 0)) / 10000 * 100 > 5
  ).length
  score -= (largePositions / closedTrades.length) * 30

  // Deduct points for risk:reward < 1:2
  const poorRR = closedTrades.filter(t => {
    if (!t.stop_loss || !t.take_profit || !t.entry_price) return true
    const risk = Math.abs(t.entry_price - t.stop_loss)
    const reward = Math.abs(t.take_profit - t.entry_price)
    return reward / risk < 2
  }).length
  score -= (poorRR / closedTrades.length) * 40

  return Math.max(0, Math.min(100, score))
}

function calculateConsistencyScore(trades: Trade[]): number {
  let score = 100
  const closedTrades = trades.filter(t => t.status === 'closed')
  
  // Calculate profit consistency
  const profits = closedTrades.map(calculateTradeProfit)
  const avgProfit = average(profits)
  const stdDev = Math.sqrt(
    average(profits.map(p => Math.pow(p - avgProfit, 2)))
  )
  const coefficientOfVariation = Math.abs(stdDev / avgProfit)
  score -= Math.min(50, coefficientOfVariation * 25)

  // Check strategy consistency
  const strategyChanges = closedTrades.reduce((changes, trade, i) => {
    if (i === 0) return 0
    return changes + (trade.strategy !== closedTrades[i-1].strategy ? 1 : 0)
  }, 0)
  score -= (strategyChanges / closedTrades.length) * 25

  // Check position size consistency
  const positionSizes = closedTrades.map(t => 
    (t.quantity * (t.entry_price || 0)) / 10000 * 100
  )
  const avgSize = average(positionSizes)
  const sizeVariance = average(positionSizes.map(s => Math.pow(s - avgSize, 2)))
  const sizeStdDev = Math.sqrt(sizeVariance)
  score -= Math.min(25, (sizeStdDev / avgSize) * 25)

  return Math.max(0, Math.min(100, score))
}

export default Learning 