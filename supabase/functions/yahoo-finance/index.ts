// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

interface RequestBody {
  symbol: string;
  startDate?: string;
  endDate?: string;
  realtime?: boolean;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

// @ts-ignore - Deno is available in the Supabase Edge Functions environment
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
      },
    });
  }

  try {
    const { symbol, startDate, endDate, realtime } = await req.json() as RequestBody;

    // If realtime is true, fetch current price
    if (realtime) {
      console.log(`Fetching real-time price for symbol: ${symbol}`);
      
      // For Indian stocks, we need to ensure the symbol has the correct suffix
      let formattedSymbol = symbol;
      if (!symbol.includes('.NS') && !symbol.includes('.BO') && symbol.length > 4) {
        // This is likely an Indian stock without the exchange suffix
        formattedSymbol = `${symbol}.NS`;
        console.log(`Detected Indian stock, formatted symbol to: ${formattedSymbol}`);
      }
      
      // First, try to get yesterday's closing price
      const historyUrl = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${formattedSymbol}`);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const period1 = Math.floor(yesterday.getTime() / 1000);
      const period2 = Math.floor(Date.now() / 1000);
      
      historyUrl.searchParams.append('period1', period1.toString());
      historyUrl.searchParams.append('period2', period2.toString());
      historyUrl.searchParams.append('interval', '1d');
      historyUrl.searchParams.append('includePrePost', 'false');
      
      console.log(`History URL: ${historyUrl.toString()}`);
      
      const historyResponse = await fetch(historyUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      let previousClose = null;
      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.chart?.result?.[0]?.indicators?.quote?.[0]?.close) {
          const closes = historyData.chart.result[0].indicators.quote[0].close;
          previousClose = closes[closes.length - 1];
          console.log(`Previous close for ${symbol}:`, previousClose);
        }
      }
      
      // Then get the current price
      const quoteUrl = new URL(`https://query1.finance.yahoo.com/v7/finance/quote`);
      quoteUrl.searchParams.append('symbols', formattedSymbol);
      quoteUrl.searchParams.append('fields', 'regularMarketPrice,regularMarketChange,regularMarketChangePercent,regularMarketTime,shortName,longName,regularMarketPreviousClose');
      
      console.log(`Quote URL: ${quoteUrl.toString()}`);
      
      const response = await fetch(quoteUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`Yahoo Finance response:`, data);
      
      const result = data.quoteResponse?.result?.[0];
      
      if (!result) {
        throw new Error('No data available for this symbol');
      }
      
      console.log(`Result for ${symbol}:`, result);
      
      // Check if we have a valid price
      if (result.regularMarketPrice === undefined || result.regularMarketPrice === null) {
        console.error(`No valid price found for ${symbol}`);
        throw new Error(`No valid price found for symbol: ${symbol}`);
      }
      
      // For debugging purposes, log all available fields
      console.log(`Available fields for ${symbol}:`, Object.keys(result));
      
      const price = result.regularMarketPrice;
      
      // Use either the previous close from history or from quote data
      const prevClose = previousClose || result.regularMarketPreviousClose;
      const change = prevClose ? (price - prevClose) : (result.regularMarketChange || 0);
      const changePercent = prevClose ? ((price - prevClose) / prevClose * 100) : (result.regularMarketChangePercent || 0);
      
      console.log(`Calculated change for ${symbol}: ${change} (${changePercent}%)`);
      
      const responseData = {
        symbol: symbol,
        price: price,
        change: change,
        changePercent: changePercent,
        previousClose: prevClose,
        time: new Date(result.regularMarketTime * 1000).toISOString(),
        name: result.shortName || result.longName || symbol
      };
      
      console.log(`Returning data for ${symbol}:`, responseData);
      
      return new Response(JSON.stringify(responseData), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    // For historical data
    if (!startDate || !endDate) {
      throw new Error('startDate and endDate are required for historical data');
    }

    // Convert dates to Unix timestamps (seconds)
    const from = Math.floor(new Date(startDate).getTime() / 1000);
    const to = Math.floor(new Date(endDate).getTime() / 1000);

    // Construct Yahoo Finance API URL with proper encoding
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.append('period1', from.toString());
    url.searchParams.append('period2', to.toString());
    url.searchParams.append('interval', '1d');
    url.searchParams.append('includePrePost', 'false');
    url.searchParams.append('events', 'div,splits');

    const response = await fetch(url.toString(), {
      headers: {
        // Add user agent to avoid 404/403 errors
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const result = data.chart.result[0];
    
    if (!result) {
      throw new Error('No data available for this symbol');
    }

    const { timestamp, indicators } = result;
    const { quote } = indicators;
    const { open, high, low, close } = quote[0];

    // Filter out any invalid data points and create candles
    const candles: CandleData[] = timestamp
      .map((time: number, index: number) => {
        // Skip if any required value is null/undefined
        if (open[index] == null || high[index] == null || 
            low[index] == null || close[index] == null) {
          return null;
        }

        return {
          time: new Date(time * 1000).toISOString().split('T')[0],
          open: Number(open[index].toFixed(2)),
          high: Number(high[index].toFixed(2)),
          low: Number(low[index].toFixed(2)),
          close: Number(close[index].toFixed(2))
        };
      })
      .filter((candle: CandleData | null): candle is CandleData => candle !== null);

    if (candles.length === 0) {
      throw new Error('No valid data points found for this symbol');
    }

    return new Response(JSON.stringify(candles), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });

  } catch (error) {
    console.error('Error:', error);
    
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred while fetching data',
        symbol: (await req.json() as RequestBody).symbol
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}); 