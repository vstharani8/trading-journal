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
    <div className="mt-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium text-gray-900">AI Trade Analysis</h3>
        {!loading && (
          <button
            onClick={handleGenerateFeedback}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            {hasFeedback ? 'Regenerate Analysis' : 'Generate Analysis'}
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : hasFeedback ? (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:p-6 space-y-6">
            {trade.ai_feedback_performance && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Performance Analysis</h4>
                <p className="mt-1 text-sm text-gray-900">{trade.ai_feedback_performance}</p>
              </div>
            )}
            
            {trade.ai_feedback_lessons && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Lessons Learned</h4>
                <p className="mt-1 text-sm text-gray-900">{trade.ai_feedback_lessons}</p>
              </div>
            )}
            
            {trade.ai_feedback_mistakes && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">Areas for Improvement</h4>
                <p className="mt-1 text-sm text-gray-900">{trade.ai_feedback_mistakes}</p>
              </div>
            )}

            {trade.ai_feedback_generated_at && (
              <div className="mt-4 text-xs text-gray-500">
                Analysis generated on {new Date(trade.ai_feedback_generated_at).toLocaleString()}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
} 