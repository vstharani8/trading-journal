export interface Investment {
  id: string
  user_id: string
  symbol: string
  purchase_date: string
  purchase_price: number
  shares: number
  commission: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BenchmarkValue {
  id: string
  date: string
  sp500_value: number
  created_at: string
}

export interface PriceCache {
  id: string
  symbol: string
  price: number
  last_updated: string
}

export interface InvestmentWithCurrentValue extends Investment {
  current_price: number
  current_value: number
  gain_loss: number
  gain_loss_percentage: number
}

export interface PortfolioSummary {
  total_value: number
  total_cost: number
  total_gain_loss: number
  total_gain_loss_percentage: number
  sp500_comparison_percentage: number
} 