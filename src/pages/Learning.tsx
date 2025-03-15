import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
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
}

function Learning() {
  const { user } = useAuth()
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
    improvementAreas: []
  })

  useEffect(() => {
    loadTrades()
  }, [])

  const refineFeedback = async (feedback: string[], type: string) => {
    try {
      let prompt = ''
      if (type === 'lessons') {
        prompt = `Summarize these trading lessons into 3-4 key actionable points:\n${feedback.join('\n')}`
      } else if (type === 'performance') {
        prompt = `Extract 3 most important performance insights from this trading feedback:\n${feedback.join('\n')}`
      } else {
        prompt = `Identify 3 critical areas for improvement from this trading feedback:\n${feedback.join('\n')}`
      }

      const completion = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
      })

      const refinedPoints = completion.choices[0]?.message?.content?.split('\n')
        .filter(point => point.trim())
        .map(point => point.replace(/^\d+\.\s*/, '').trim()) || []

      return refinedPoints.length > 0 ? refinedPoints : feedback.slice(0, 3)
    } catch (err) {
      console.error('Error refining feedback:', err)
      return feedback.slice(0, 3) // Fallback to first 3 original points
    }
  }

  const aggregateAnalytics = async (trades: Trade[]) => {
    const aggregated: AggregatedAnalytics = {
      commonMistakes: {},
      successfulStrategies: {},
      profitableSetups: {},
      emotionalPatterns: {},
      overallPerformance: [],
      keyLessons: [],
      improvementAreas: []
    }

    // Process each trade's AI feedback
    trades.forEach(trade => {
      if (trade.strategy) {
        aggregated.successfulStrategies[trade.strategy] = (aggregated.successfulStrategies[trade.strategy] || 0) + 1
      }
      if (trade.trade_setup) {
        aggregated.profitableSetups[trade.trade_setup] = (aggregated.profitableSetups[trade.trade_setup] || 0) + 1
      }
      if (trade.emotional_state) {
        aggregated.emotionalPatterns[trade.emotional_state] = (aggregated.emotionalPatterns[trade.emotional_state] || 0) + 1
      }
      if (trade.growth_areas) {
        aggregated.commonMistakes[trade.growth_areas] = (aggregated.commonMistakes[trade.growth_areas] || 0) + 1
      }

      // Collect unique insights from AI feedback
      if (trade.ai_feedback_performance) {
        const insights = trade.ai_feedback_performance.split('\n').map(i => i.trim())
        aggregated.overallPerformance.push(...insights)
      }
      if (trade.ai_feedback_lessons) {
        const lessons = trade.ai_feedback_lessons.split('\n').map(l => l.trim())
        aggregated.keyLessons.push(...lessons)
      }
      if (trade.ai_feedback_mistakes) {
        const mistakes = trade.ai_feedback_mistakes.split('\n').map(m => m.trim())
        aggregated.improvementAreas.push(...mistakes)
      }
    })

    // Remove duplicates and sort by frequency
    aggregated.overallPerformance = Array.from(new Set(aggregated.overallPerformance))
    aggregated.keyLessons = Array.from(new Set(aggregated.keyLessons))
    aggregated.improvementAreas = Array.from(new Set(aggregated.improvementAreas))

    // Refine feedback using OpenAI
    const [refinedLessons, refinedPerformance, refinedAreas] = await Promise.all([
      refineFeedback(aggregated.keyLessons, 'lessons'),
      refineFeedback(aggregated.overallPerformance, 'performance'),
      refineFeedback(aggregated.improvementAreas, 'improvements')
    ])

    aggregated.keyLessons = refinedLessons
    aggregated.overallPerformance = refinedPerformance
    aggregated.improvementAreas = refinedAreas

    setAnalytics(aggregated)
  }

  const loadTrades = async () => {
    try {
      setLoading(true)
      const allTrades = await db.getAllTrades()
      const closedTrades = allTrades.filter(trade => trade.status === 'closed')
      setTrades(closedTrades)
      await aggregateAnalytics(closedTrades)
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
        <p className="text-sm text-gray-600">
          Based on {trades.length} closed trades
        </p>
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