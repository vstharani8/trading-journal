import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Trade {
  id: string
  symbol: string
  entry_date: string
  exit_date: string | null
  entry_price: number
  exit_price: number | null
  position_size: number
  type: 'long' | 'short'
  stop_loss: number | null
  take_profit: number | null
  fees: number | null
  strategy: string | null
  notes: string
  screenshot: string | null
  status: 'open' | 'closed'
  created_at: string
  updated_at: string
  user_id: string
}

export interface Strategy {
  id: string
  name: string
  user_id: string
  created_at: string
}

// Database operations
export const db = {
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

  async addTrade(trade: Omit<Trade, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const { data, error } = await supabase
      .from('trades')
      .insert([trade])
      .select('id')
      .single()

    if (error) throw error
    return data.id
  },

  async updateTrade(trade: Trade): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .update(trade)
      .eq('id', trade.id)

    if (error) throw error
  },

  async deleteTrade(id: string): Promise<void> {
    const { error } = await supabase
      .from('trades')
      .delete()
      .eq('id', id)

    if (error) throw error
  },

  // Strategy operations
  async getStrategies(): Promise<string[]> {
    const { data, error } = await supabase
      .from('strategies')
      .select('name')
      .order('name')

    if (error) throw error
    return data.map(s => s.name)
  },

  async setStrategies(strategies: string[]): Promise<void> {
    // First, delete all existing strategies
    const { error: deleteError } = await supabase
      .from('strategies')
      .delete()
      .neq('id', '0')

    if (deleteError) throw deleteError

    // Then insert the new strategies
    if (strategies.length > 0) {
      const { error: insertError } = await supabase
        .from('strategies')
        .insert(strategies.map(name => ({ name })))

      if (insertError) throw insertError
    }
  },

  // Export/Import operations
  async exportData(): Promise<string> {
    const [trades, strategies] = await Promise.all([
      this.getAllTrades(),
      this.getStrategies()
    ])

    return JSON.stringify({ trades, strategies }, null, 2)
  },

  async importData(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData)
    
    // Clear existing data
    await Promise.all([
      supabase.from('trades').delete().neq('id', '0'),
      supabase.from('strategies').delete().neq('id', '0')
    ])
    
    // Import new data
    if (data.trades?.length > 0) {
      const { error: tradesError } = await supabase
        .from('trades')
        .insert(data.trades)

      if (tradesError) throw tradesError
    }

    if (data.strategies?.length > 0) {
      const { error: strategiesError } = await supabase
        .from('strategies')
        .insert(data.strategies.map((name: string) => ({ name })))

      if (strategiesError) throw strategiesError
    }
  }
} 