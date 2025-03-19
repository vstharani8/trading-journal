// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SendGridClient } from 'https://deno.land/x/sendgrid@0.0.3/mod.ts'

console.log("Hello from Functions!")

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get the request body
    const { type, email, userId } = await req.json()

    // Get user's investments
    const { data: investments, error: investmentsError } = await supabaseClient
      .from('investments')
      .select('*')
      .eq('user_id', userId)

    if (investmentsError) {
      throw investmentsError
    }

    // Initialize SendGrid
    const sendgrid = new SendGridClient({ apiKey: Deno.env.get('SENDGRID_API_KEY') ?? '' })

    // Create email content
    const totalInvestments = investments.length
    const totalValue = investments.reduce((sum, inv) => sum + (inv.purchase_price * inv.number_of_shares), 0)

    const emailContent = `
      <h2>Your Investment Portfolio Summary</h2>
      <p>Here's a summary of your current investments:</p>
      <ul>
        <li>Total number of investments: ${totalInvestments}</li>
        <li>Total invested value: $${totalValue.toFixed(2)}</li>
      </ul>
      <h3>Investment Details:</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
        <tr style="background-color: #f8f9fa;">
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Stock Symbol</th>
          <th style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">Purchase Date</th>
          <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Shares</th>
          <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Purchase Price</th>
          <th style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">Total Value</th>
        </tr>
        ${investments.map(inv => `
          <tr>
            <td style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">${inv.stock_symbol}</td>
            <td style="padding: 12px; text-align: left; border: 1px solid #dee2e6;">${new Date(inv.purchase_date).toLocaleDateString()}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">${inv.number_of_shares}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">$${inv.purchase_price.toFixed(2)}</td>
            <td style="padding: 12px; text-align: right; border: 1px solid #dee2e6;">$${(inv.purchase_price * inv.number_of_shares).toFixed(2)}</td>
          </tr>
        `).join('')}
      </table>
      <p style="margin-top: 20px;">
        <a href="${Deno.env.get('APP_URL') ?? ''}/investments" style="padding: 12px 24px; background-color: #4f46e5; color: white; text-decoration: none; border-radius: 6px;">View Portfolio</a>
      </p>
    `

    // Send the email
    const message = {
      to: email,
      from: Deno.env.get('SENDGRID_FROM_EMAIL') ?? 'vstharani8@gmail.com',
      subject: 'Your Investment Portfolio Summary',
      html: emailContent,
    }

    const response = await sendgrid.send(message)
    
    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/stock-purchase-reminder' \
    --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
