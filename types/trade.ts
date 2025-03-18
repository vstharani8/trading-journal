export type TradeExit = {
  id: string;
  trade_id: string;
  exit_date: string;
  exit_price: number;
  quantity: number;
  fees?: number;
  notes?: string;
  exit_trigger?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
};

export type TradeBase = {
  symbol: string;
  type: 'long' | 'short';
  entry_date: string;
  entry_price: number | null;
  quantity: number;
  remaining_quantity: number | null;
  average_exit_price: number | null;
  exit_date: string | null;
  exit_price: number | null;
  fees: number;
  strategy: string;
  notes: string;
  status: 'open' | 'closed';
  market: 'US' | 'IN';
  stop_loss: number | null;
  take_profit: number | null;
  screenshot: string | null;
  market_conditions: 'bullish' | 'bearish' | 'neutral' | null;
  emotional_state: 'confident' | 'uncertain' | 'neutral' | null;
  trade_setup: string | null;
  proficiency: string | null;
  growth_areas: string | null;
  exit_trigger: string | null;
  ai_feedback_performance: string | null;
  ai_feedback_lessons: string | null;
  ai_feedback_mistakes: string | null;
  ai_feedback_generated_at: string | null;
  user_id: string;
};

export type Trade = TradeBase & {
  id: string;
  created_at: string;
  updated_at: string;
  exits: TradeExit[];
};

export type TradeFormData = Omit<TradeBase, 'entry_price'> & {
  entry_price: number | null;
}; 