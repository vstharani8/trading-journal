import { supabase } from './supabase';
import { alphaVantage } from './alphaVantage';
import type { 
  Investment,
  InvestmentWithCurrentValue,
  BenchmarkValue,
  PriceCache,
  PortfolioSummary
} from '../types/investment';

class InvestmentService {
  // Investment operations
  async getAllInvestments(userId: string): Promise<Investment[]> {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('user_id', userId)
      .order('purchase_date', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  async getInvestment(id: string): Promise<Investment | null> {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async addInvestment(investment: Omit<Investment, 'id' | 'created_at' | 'updated_at'>): Promise<Investment> {
    // Get current S&P 500 value and store it
    const sp500Quote = await alphaVantage.getSP500Value();
    await this.addBenchmarkValue({
      date: sp500Quote.timestamp,
      sp500_value: sp500Quote.price
    });

    const { data, error } = await supabase
      .from('investments')
      .insert(investment)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateInvestment(id: string, investment: Partial<Investment>): Promise<Investment> {
    const { data, error } = await supabase
      .from('investments')
      .update(investment)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteInvestment(id: string): Promise<void> {
    const { error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // Benchmark value operations
  async addBenchmarkValue(benchmarkValue: Omit<BenchmarkValue, 'id' | 'created_at'>): Promise<BenchmarkValue> {
    const { data, error } = await supabase
      .from('benchmark_values')
      .insert(benchmarkValue)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getBenchmarkValue(date: string): Promise<BenchmarkValue | null> {
    const { data, error } = await supabase
      .from('benchmark_values')
      .select('*')
      .eq('date', date)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Price cache operations
  private async updatePriceCache(symbol: string, price: number): Promise<void> {
    const { error } = await supabase
      .from('price_cache')
      .upsert({
        symbol,
        price,
        last_updated: new Date().toISOString()
      });

    if (error) throw error;
  }

  private async getPriceCacheEntry(symbol: string): Promise<PriceCache | null> {
    const { data, error } = await supabase
      .from('price_cache')
      .select('*')
      .eq('symbol', symbol)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  // Investment analysis operations
  async getInvestmentWithCurrentValue(investment: Investment): Promise<InvestmentWithCurrentValue> {
    let currentPrice: number;

    // Check price cache first
    const cacheEntry = await this.getPriceCacheEntry(investment.symbol);
    const cacheExpiry = 5 * 60 * 1000; // 5 minutes

    if (cacheEntry && (Date.now() - new Date(cacheEntry.last_updated).getTime()) < cacheExpiry) {
      currentPrice = cacheEntry.price;
    } else {
      const quote = await alphaVantage.queueRequest(() => alphaVantage.getQuote(investment.symbol));
      currentPrice = quote.price;
      await this.updatePriceCache(investment.symbol, currentPrice);
    }

    const currentValue = currentPrice * investment.shares;
    const totalCost = (investment.purchase_price * investment.shares) + investment.commission;
    const gainLoss = currentValue - totalCost;
    const gainLossPercentage = (gainLoss / totalCost) * 100;

    return {
      ...investment,
      current_price: currentPrice,
      current_value: currentValue,
      gain_loss: gainLoss,
      gain_loss_percentage: gainLossPercentage
    };
  }

  async getPortfolioSummary(userId: string): Promise<PortfolioSummary> {
    const investments = await this.getAllInvestments(userId);
    const investmentsWithValue = await Promise.all(
      investments.map(inv => this.getInvestmentWithCurrentValue(inv))
    );

    const totalValue = investmentsWithValue.reduce((sum, inv) => sum + inv.current_value, 0);
    const totalCost = investmentsWithValue.reduce(
      (sum, inv) => sum + (inv.purchase_price * inv.shares) + inv.commission,
      0
    );
    const totalGainLoss = totalValue - totalCost;
    const totalGainLossPercentage = (totalGainLoss / totalCost) * 100;

    // Calculate S&P 500 comparison
    const oldestInvestment = investments.reduce(
      (oldest, current) => 
        new Date(current.purchase_date) < new Date(oldest.purchase_date) ? current : oldest,
      investments[0]
    );

    const oldestBenchmark = await this.getBenchmarkValue(oldestInvestment.purchase_date);
    const currentSP500 = await alphaVantage.queueRequest(() => alphaVantage.getSP500Value());
    
    const sp500ComparisonPercentage = oldestBenchmark 
      ? ((currentSP500.price - oldestBenchmark.sp500_value) / oldestBenchmark.sp500_value) * 100
      : 0;

    return {
      total_value: totalValue,
      total_cost: totalCost,
      total_gain_loss: totalGainLoss,
      total_gain_loss_percentage: totalGainLossPercentage,
      sp500_comparison_percentage: sp500ComparisonPercentage
    };
  }
}

export const investmentService = new InvestmentService(); 