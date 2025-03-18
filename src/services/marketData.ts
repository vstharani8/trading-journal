import axios from 'axios';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// Market type definition
export type Market = 'US' | 'IN';

// Helper function to format stock symbol based on market
function formatStockSymbol(symbol: string, market: Market): string {
  // Remove any existing exchange suffixes first
  const baseSymbol = symbol.replace(/\.(NS|BO)$/, '').toUpperCase().trim();
  
  console.log(`Formatting symbol: ${symbol}, market: ${market}, baseSymbol: ${baseSymbol}`);
  
  switch (market) {
    case 'IN':
      // For Indian stocks, use NSE suffix for Yahoo Finance
      return `${baseSymbol}.NS`;
    case 'US':
      return baseSymbol;
    default:
      return baseSymbol;
  }
}

export async function fetchHistoricalData(
  symbol: string,
  startDate: string,
  endDate: string,
  market: Market = 'US'
): Promise<CandleData[]> {
  try {
    // Format the symbol appropriately based on the market
    const formattedSymbol = formatStockSymbol(symbol, market);

    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/yahoo-finance`,
      {
        symbol: formattedSymbol,
        startDate,
        endDate
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
        }
      }
    );

    // If no data is returned, throw an error
    if (!response.data || response.data.length === 0) {
      throw new Error(`No data available for symbol: ${formattedSymbol}`);
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      throw new Error(`Stock symbol not found: ${symbol}. For Indian stocks, make sure to use NSE symbols.`);
    }
    throw error;
  }
}

// Helper function to get date range for chart
export function getChartDateRange(
  entryDate: string,
  exitDate?: string | null
): {
  startDate: string;
  endDate: string;
} {
  const start = new Date(entryDate);
  // Get 1 month before entry
  start.setMonth(start.getMonth() - 1);

  let end: Date;
  if (exitDate) {
    end = new Date(exitDate);
    // For closed trades, get 2 weeks after exit
    end.setDate(end.getDate() + 14);
  } else {
    // For open trades, use current date
    end = new Date();
    // Adjust for Indian market if needed (end of day IST)
    if (end.getHours() < 19) { // If before 19:00 IST
      end.setDate(end.getDate() - 1); // Use previous day's data
    }
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
}

export interface CurrentPriceData {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  lastUpdated: Date;
}

export async function fetchCurrentPrices(symbols: string[], market: Market = 'US'): Promise<CurrentPriceData[]> {
  try {
    // Process symbols in batches to avoid overloading the API
    const batchSize = 5;
    const results: CurrentPriceData[] = [];
    
    // Process symbols in batches
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(async (symbol) => {
        try {
          // Format the symbol appropriately based on the market
          const formattedSymbol = formatStockSymbol(symbol, market);
          
          console.log(`Fetching current price for ${formattedSymbol}`);
          const response = await axios.post(
            `${SUPABASE_URL}/functions/v1/yahoo-finance`,
            {
              symbol: formattedSymbol,
              realtime: true
            },
            {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
              }
            }
          );
          
          console.log(`Response for ${formattedSymbol}:`, response.data);
          
          if (!response.data || response.data.price === undefined) {
            throw new Error(`No price data available for symbol: ${formattedSymbol}`);
          }
          
          // Convert price to number to ensure it's not a string
          const price = typeof response.data.price === 'string' 
            ? parseFloat(response.data.price) 
            : response.data.price;
          
          const priceData: CurrentPriceData = {
            symbol,
            price: price,
            change: response.data.change || 0,
            changePercent: response.data.changePercent || 0,
            lastUpdated: new Date()
          };
          
          return priceData;
        } catch (error) {
          console.error(`Error fetching current price for ${symbol}:`, error);
          return null;
        }
      });
      
      // Wait for all promises in this batch to resolve
      const batchResults = await Promise.all(batchPromises);
      
      // Add valid results to the results array
      results.push(...batchResults.filter((result): result is CurrentPriceData => result !== null));
      
      // Add a small delay between batches to avoid rate limiting
      if (i + batchSize < symbols.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    return results;
  } catch (error) {
    console.error('Error fetching current prices:', error);
    throw error;
  }
} 