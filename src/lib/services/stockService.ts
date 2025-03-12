import { StockPrice } from '../../types/investment';

const FINNHUB_API_KEY = 'cv77urhr01qsq4659dc0cv77urhr01qsq4659dcg';
const BASE_URL = 'https://finnhub.io/api/v1';

export class StockService {
    private static async fetchStockPrice(symbol: string): Promise<number> {
        const url = `${BASE_URL}/quote?symbol=${symbol}&token=${FINNHUB_API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.c) { // Current price is in the 'c' field
                return data.c;
            }
            
            throw new Error('Unable to fetch stock price');
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            throw error;
        }
    }

    private static async fetchHistoricalPrices(symbol: string, fromDate: string): Promise<{ [date: string]: number }> {
        // Convert date to Unix timestamp (seconds)
        const toTimestamp = Math.floor(new Date().getTime() / 1000);
        const fromTimestamp = Math.floor(new Date(fromDate).getTime() / 1000);
        
        const url = `${BASE_URL}/stock/candle?symbol=${symbol}&resolution=D&from=${fromTimestamp}&to=${toTimestamp}&token=${FINNHUB_API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.c && data.c.length > 0 && data.t && data.t.length > 0) {
                const prices: { [date: string]: number } = {};
                // Combine timestamps and prices
                data.t.forEach((timestamp: number, index: number) => {
                    const date = new Date(timestamp * 1000).toISOString().split('T')[0];
                    prices[date] = data.c[index];
                });
                return prices;
            }
            
            throw new Error(`Unable to fetch historical prices`);
        } catch (error) {
            console.error(`Error fetching historical prices for ${symbol}:`, error);
            throw error;
        }
    }

    static async getStockPrices(symbols: string[]): Promise<StockPrice[]> {
        const prices: StockPrice[] = [];
        
        for (const symbol of symbols) {
            try {
                const price = await this.fetchStockPrice(symbol);
                prices.push({
                    symbol,
                    price,
                    lastUpdated: new Date()
                });
                
                // Add a small delay between requests to stay within rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to fetch price for ${symbol}`);
            }
        }
        
        return prices;
    }

    static async getPortfolioHistory(investments: { stock_symbol: string; purchase_date: string; number_of_shares: number }[]): Promise<{ date: string; value: number }[]> {
        const historyMap = new Map<string, number>();
        
        for (const investment of investments) {
            try {
                const prices = await this.fetchHistoricalPrices(investment.stock_symbol, investment.purchase_date);
                
                // Add portfolio value for each date
                Object.entries(prices).forEach(([date, price]) => {
                    const value = price * investment.number_of_shares;
                    historyMap.set(date, (historyMap.get(date) || 0) + value);
                });
                
                // Add a small delay between requests to stay within rate limits
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error(`Failed to fetch historical prices for ${investment.stock_symbol}`);
            }
        }
        
        // Convert map to sorted array
        return Array.from(historyMap.entries())
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
} 