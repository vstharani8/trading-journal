// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

interface RequestBody {
  symbol: string;
  startDate: string;
  endDate: string;
}

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
}

console.log("Hello from Functions!")

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    });
  }

  try {
    const { symbol, startDate, endDate } = await req.json() as RequestBody;

    // Convert dates to Unix timestamps (seconds)
    const from = Math.floor(new Date(startDate).getTime() / 1000);
    const to = Math.floor(new Date(endDate).getTime() / 1000);

    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}`);
    url.searchParams.append('period1', from.toString());
    url.searchParams.append('period2', to.toString());
    url.searchParams.append('interval', '1d');
    url.searchParams.append('includePrePost', 'false');
    url.searchParams.append('events', 'div,splits');

    const response = await fetch(url.toString());
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

    const candles: CandleData[] = timestamp.map((time: number, index: number) => ({
      time: new Date(time * 1000).toISOString().split('T')[0],
      open: open[index],
      high: high[index],
      low: low[index],
      close: close[index]
    })).filter((candle: CandleData) => 
      candle.open != null && 
      candle.high != null && 
      candle.low != null && 
      candle.close != null
    );

    return new Response(
      JSON.stringify(candles),
      { 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        } 
      }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/yahoo-finance' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
