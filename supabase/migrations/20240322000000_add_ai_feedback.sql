-- Add AI feedback columns to trades table
ALTER TABLE trades
ADD COLUMN ai_feedback_performance TEXT,
ADD COLUMN ai_feedback_lessons TEXT,
ADD COLUMN ai_feedback_mistakes TEXT,
ADD COLUMN ai_feedback_generated_at TIMESTAMP WITH TIME ZONE;

-- Create index for AI feedback timestamp
CREATE INDEX trades_ai_feedback_generated_at_idx ON trades(ai_feedback_generated_at);

COMMENT ON COLUMN trades.ai_feedback_performance IS 'AI analysis of trade performance';
COMMENT ON COLUMN trades.ai_feedback_lessons IS 'AI-generated lessons learned from the trade';
COMMENT ON COLUMN trades.ai_feedback_mistakes IS 'AI-identified mistakes and areas for improvement';
COMMENT ON COLUMN trades.ai_feedback_generated_at IS 'Timestamp when AI feedback was generated'; 