import axios from 'axios';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export async function fetchHistoricalData(
  symbol: string,
  startDate: string,
  endDate: string
): Promise<CandleData[]> {
  try {
    const response = await axios.post(
      `${SUPABASE_URL}/functions/v1/yahoo-finance`,
      {
        symbol,
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

    return response.data;
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw error;
  }
}

// Helper function to get date range for chart
export function getChartDateRange(entryDate: string, exitDate?: string | null): {
  startDate: string;
  endDate: string;
} {
  const start = new Date(entryDate);
  start.setMonth(start.getMonth() - 1); // Get 1 month before entry

  const end = exitDate 
    ? new Date(exitDate)
    : new Date(); // If trade is still open, use current date

  // If trade is closed, get 2 weeks after exit
  if (exitDate) {
    end.setDate(end.getDate() + 14); // Changed from 7 to 14 days
  }

  return {
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0]
  };
} 