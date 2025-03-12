const ALPHA_VANTAGE_API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY;
const BASE_URL = 'https://www.alphavantage.co/query';

if (!ALPHA_VANTAGE_API_KEY) {
  throw new Error('Missing Alpha Vantage API key in environment variables');
}

export interface StockQuote {
  symbol: string;
  price: number;
  timestamp: string;
}

class AlphaVantageService {
  private async fetchData(endpoint: string, params: Record<string, string>): Promise<any> {
    const queryParams = new URLSearchParams({
      ...params,
      apikey: ALPHA_VANTAGE_API_KEY
    });

    const response = await fetch(`${BASE_URL}?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    if (data['Error Message']) {
      throw new Error(`Alpha Vantage API error: ${data['Error Message']}`);
    }

    return data;
  }

  async getQuote(symbol: string): Promise<StockQuote> {
    const data = await this.fetchData('', {
      function: 'GLOBAL_QUOTE',
      symbol
    });

    const quote = data['Global Quote'];
    if (!quote) {
      throw new Error(`No quote data found for symbol: ${symbol}`);
    }

    return {
      symbol,
      price: parseFloat(quote['05. price']),
      timestamp: quote['07. latest trading day']
    };
  }

  async getSP500Value(): Promise<StockQuote> {
    return this.getQuote('^GSPC');
  }

  // Rate limit helper - Alpha Vantage has a limit of 5 API calls per minute for free tier
  private queue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  private async processQueue() {
    if (this.isProcessingQueue) return;
    this.isProcessingQueue = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          console.error('Error processing queue task:', error);
        }
        // Wait 12 seconds between requests to stay within rate limit
        await new Promise(resolve => setTimeout(resolve, 12000));
      }
    }

    this.isProcessingQueue = false;
  }

  async queueRequest<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await request();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }
}

export const alphaVantage = new AlphaVantageService(); 