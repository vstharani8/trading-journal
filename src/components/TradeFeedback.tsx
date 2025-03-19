import { useState } from 'react';
import { Trade } from '../services/supabase';
import { generateTradeFeedback } from '../services/openai';
import { db } from '../services/supabase';

interface TradeFeedbackProps {
  trade: Trade;
  onFeedbackGenerated?: () => void;
}

export default function TradeFeedback({ trade, onFeedbackGenerated }: TradeFeedbackProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasFeedback = !!(
    trade.ai_feedback_performance ||
    trade.ai_feedback_lessons ||
    trade.ai_feedback_mistakes
  );

  const handleGenerateFeedback = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const feedback = await generateTradeFeedback(trade);
      await db.updateTradeFeedback(trade.id, feedback);
      
      if (onFeedbackGenerated) {
        onFeedbackGenerated();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate feedback');
    } finally {
      setLoading(false);
    }
  };

  if (!trade.exit_price || trade.status !== 'closed') {
    return null;
  }

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="text-xl font-semibold text-gray-900">AI Trade Analysis</h3>
        </div>
        {!loading && (
          <button
            onClick={handleGenerateFeedback}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            disabled={loading}
          >
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {hasFeedback ? 'Regenerate Analysis' : 'Generate Analysis'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 border border-red-100">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            <p className="text-sm text-gray-600">Analyzing trade data...</p>
          </div>
        </div>
      ) : hasFeedback ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Performance Analysis Card */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Performance Analysis</h4>
            </div>
            <div className="space-y-3">
              {trade.ai_feedback_performance?.split('\n').map((point, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-indigo-600 mt-1">•</span>
                  <p className="text-gray-700">{point.replace(/^[•-]\s*/, '')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* What Worked Well Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl p-6 border border-emerald-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">What Worked Well</h4>
            </div>
            <div className="space-y-3">
              {trade.ai_feedback_lessons?.split('\n').map((point, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-emerald-600 mt-1">•</span>
                  <p className="text-gray-700">{point.replace(/^[•-]\s*/, '')}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Areas to Improve Card */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-amber-100 rounded-lg">
                <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h4 className="text-lg font-semibold text-gray-900">Areas to Improve</h4>
            </div>
            <div className="space-y-3">
              {trade.ai_feedback_mistakes?.split('\n').map((point, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-amber-600 mt-1">•</span>
                  <p className="text-gray-700">{point.replace(/^[•-]\s*/, '')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* Timestamp */}
      {trade.ai_feedback_generated_at && (
        <div className="mt-6 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Last analyzed on {new Date(trade.ai_feedback_generated_at).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
} 