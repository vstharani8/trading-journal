import { useState, useEffect } from 'react'
import { db } from '../services/supabase'
import { Trade } from '../services/supabase'
import OpenAI from 'openai'

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
}

function Learning() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [trades, setTrades] = useState<Trade[]>([])
  const [analytics, setAnalytics] = useState<AggregatedAnalytics>({
    commonMistakes: {},
    successfulStrategies: {},
    profitableSetups: {},
    emotionalPatterns: {},
    overallPerformance: [],
    keyLessons: [],
    improvementAreas: [],
    lastAnalyzedAt: undefined
  })
  const [analyzing, setAnalyzing] = useState(false)

  useEffect(() => {
    loadTrades()
  }, [])

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
      lastAnalyzedAt: undefined
    }

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
      </div>
    </div>
  )
}

export default Learning 