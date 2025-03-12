import { StockPrice } from '../../types/investment';

const ALPHA_VANTAGE_API_KEY = process.env.VITE_ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

export class StockService {
    private static async fetchStockPrice(symbol: string): Promise<number> {
        const url = `${BASE_URL}?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${ALPHA_VANTAGE_API_KEY}`;
        
        try {
            const response = await fetch(url);
            const data = await response.json();
            
            if (data['Global Quote'] && data['Global Quote']['05. price']) {
                return parseFloat(data['Global Quote']['05. price']);
            }
            
            throw new Error('Unable to fetch stock price');
        } catch (error) {
            console.error(`Error fetching price for ${symbol}:`, error);
            throw error;
        }
    }

    static async getStockPrices(symbols: string[]): Promise<StockPrice[]> {
        // Alpha Vantage has rate limits, so we need to handle requests sequentially
        const prices: StockPrice[] = [];
        
        for (const symbol of symbols) {
            try {
                const price = await this.fetchStockPrice(symbol);
                prices.push({
                    symbol,
                    price,
                    lastUpdated: new Date()
                });
            } catch (error) {
                console.error(`Failed to fetch price for ${symbol}`);
            }
        }
        
        return prices;
    }

    static async getSPYPrice(): Promise<number> {
        return this.fetchStockPrice('SPY');
    }
} 