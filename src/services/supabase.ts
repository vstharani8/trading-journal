import { createClient } from '@supabase/supabase-js'
import { Market } from './marketData'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Trade {
  id: string
  user_id: string
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
  created_at: string
  updated_at: string
  ai_feedback_performance: string | null
  ai_feedback_lessons: string | null
  ai_feedback_mistakes: string | null
  ai_feedback_generated_at: string | null
  market_conditions?: 'bullish' | 'bearish' | 'neutral' | null
  trade_setup?: string | null
  emotional_state?: 'confident' | 'uncertain' | 'neutral' | null
  proficiency?: string | null
  growth_areas?: string | null
  exit_trigger?: string | null
  market: Market
}

export interface Strategy {
  id: string
  name: string
  user_id: string
  created_at: string
}

export interface UserSettings {
  id: string
  user_id: string
  total_capital: number
  risk_per_trade: number
  created_at: string
  updated_at: string
}

// Database operations
export const db = {
  supabase,
  
  // Trade operations
  async getAllTrades(): Promise<Trade[]> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: false })

    if (error) throw error
    return data || []
  },

  async getTrade(id: string): Promise<Trade | null> {
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async addTrade(trade: Omit<Trade, 'id' | 'created_at' | 'updated_at'>): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .insert([{ ...trade, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }])
      .select()
      .single()

    if (error) throw error
    return data
  },

  async updateTrade(trade: Trade): Promise<Trade> {
    const { data, error } = await supabase
      .from('trades')
      .update({ ...trade, updated_at: new Date().toISOString() })
      .eq('id', trade.id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async deleteTrade(id: string): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Strategy operations
  async getStrategies(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('strategies')
      .select('name')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return data?.map(strategy => strategy.name) || [];
  },

  async addStrategy(userId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('strategies')
      .insert([{ 
        user_id: userId,
        name,
        created_at: new Date().toISOString()
      }]);

    if (error) throw error;
  },

  async deleteStrategy(userId: string, name: string): Promise<void> {
    const { error } = await supabase
      .from('strategies')
      .delete()
      .eq('user_id', userId)
      .eq('name', name);

    if (error) throw error;
  },

  // User settings operations
  async getUserSettings(userId: string): Promise<UserSettings | null> {
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') throw error // PGRST116 is "no rows returned"
    return data
  },

  async updateUserSettings(settings: Partial<UserSettings> & { user_id: string }): Promise<UserSettings> {
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        ...settings,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  // Export/Import operations
  async exportData(): Promise<string> {
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .order('entry_date', { ascending: true })

    if (tradesError) throw tradesError

    return JSON.stringify({ trades }, null, 2)
  },

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData)
    
    if (!data.trades || !Array.isArray(data.trades)) {
      throw new Error('Invalid import data format')
    }

    const { error } = await supabase
      .from('trades')
      .insert(data.trades)

    if (error) throw error
  },

  async updateTradeFeedback(
    tradeId: string,
    feedback: {
      performance: string;
      lessons: string;
      mistakes: string;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .update({
        ai_feedback_performance: feedback.performance,
        ai_feedback_lessons: feedback.lessons,
        ai_feedback_mistakes: feedback.mistakes,
        ai_feedback_generated_at: new Date().toISOString()
      })
      .eq('id', tradeId)

    if (error) throw error
  }
} 