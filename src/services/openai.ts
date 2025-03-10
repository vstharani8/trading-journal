import { Trade } from './supabase';

interface TradeFeedback {
  performance: string;
  lessons: string;
  mistakes: string;
}

export async function generateTradeFeedback(trade: Trade): Promise<TradeFeedback> {
  const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  if (!trade.entry_price || !trade.exit_price) {
    throw new Error('Trade must have both entry and exit prices');
  }

  // Calculate profit/loss and other metrics
  const entryTotal = trade.entry_price * trade.quantity;
  const exitTotal = trade.exit_price * trade.quantity;
  const profitLoss = trade.type === 'long' ? exitTotal - entryTotal : entryTotal - exitTotal;
  const profitLossPercentage = (profitLoss / entryTotal) * 100;
  const riskAmount = trade.stop_loss ? Math.abs(trade.entry_price - trade.stop_loss) * trade.quantity : null;
  const rewardAmount = trade.take_profit ? Math.abs(trade.take_profit - trade.entry_price) * trade.quantity : null;
  const riskRewardRatio = (riskAmount && rewardAmount) ? (rewardAmount / riskAmount).toFixed(2) : 'Not set';
  
  // Calculate risk percentage if stop loss is set
  const riskPercentage = trade.stop_loss ? 
    ((Math.abs(trade.entry_price - trade.stop_loss) / trade.entry_price) * 100).toFixed(2) + '%' : 
    'Not set';

  const prompt = `As an expert trading coach, analyze this ${trade.type} trade on ${trade.symbol}:

Key Metrics:
- P/L: ${profitLoss >= 0 ? '+' : ''}$${profitLoss.toFixed(2)} (${profitLossPercentage.toFixed(2)}%)
- Entry Price: $${trade.entry_price}
- Exit Price: $${trade.exit_price}
- Stop Loss: ${trade.stop_loss ? '$' + trade.stop_loss : 'Not set'}
- Take Profit: ${trade.take_profit ? '$' + trade.take_profit : 'Not set'}
- Risk/Reward: ${riskRewardRatio}
- Risk %: ${riskPercentage}
- Strategy: ${trade.strategy}
- Market Conditions: ${trade.market_conditions || 'Not specified'}
- Trade Setup: ${trade.trade_setup || 'Not specified'}
- Emotional State: ${trade.emotional_state || 'Not specified'}
- Exit Trigger: ${trade.exit_trigger || 'Not specified'}

Provide exactly 3 points for each section. Start each point directly with the analysis, no prefixes or labels:

Performance Analysis:
• First point about execution
• Second point about risk
• Third point about strategy

What Worked Well:
• First strength point
• Second strength point
• Third strength point

Areas to Improve:
• First improvement point
• Second improvement point
• Third improvement point

Keep each point:
- Clear and actionable
- Focused on specific trading behaviors
- Based on the actual trade metrics
- Without any labels or prefixes`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are an experienced trading coach analyzing trade performance. Provide direct feedback without labels or prefixes. Each point should:\n" +
            "1. Start directly with the analysis (no 'Point 1:', 'Analysis:', etc.)\n" +
            "2. Be a complete, actionable insight\n" +
            "3. Focus on specific behaviors and decisions\n" +
            "4. Be based on the trade data provided\n\n" +
            "Format each point as a clean bullet point without any prefixes or labels."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      throw new Error('Failed to generate trade feedback');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Split the content into sections and format them
    const sections = content.split(/\n\n|\r\n\r\n/);
    
    // Helper function to clean bullet points and format text
    const cleanBulletPoints = (text: string) => {
      // First, remove any section headers that might appear as full lines
      const withoutHeaders = text.replace(/^(Performance Analysis|What Worked Well|Improvement Areas|Areas to Improve).*$/gmi, '');
      
      // Then split into lines and clean each line
      return withoutHeaders
        .split('\n')
        .map(line => line
          // Remove all possible prefixes (dots, bullets, numbers, headers)
          .replace(/^[•\-\*\d.]\s*/, '')
          .replace(/^\.\s*/, '') // Remove single dots
          .replace(/^([A-Za-z]+\s)?Analysis:?\s*/i, '') // Remove "Analysis:" or similar
          .replace(/^([A-Za-z]+\s)?Management:?\s*/i, '') // Remove "Management:" or similar
          .replace(/^([A-Za-z]+\s)?Alignment:?\s*/i, '') // Remove "Alignment:" or similar
          .replace(/^([A-Za-z]+\s)?Decisions:?\s*/i, '') // Remove "Decisions:" or similar
          .replace(/^(Performance Analysis|What Worked Well|Improvement Areas|Areas to Improve)[:]\s*/i, '')
          .trim()
        )
        .filter(line => {
          // Filter out lines that are just headers or empty
          const isHeader = /^(Performance Analysis|What Worked Well|Improvement Areas|Areas to Improve|Trade Execution|Risk Management|Strategy Alignment)$/i.test(line);
          return line && !isHeader;
        })
        .join('\n');
    };
    
    return {
      performance: cleanBulletPoints(sections[0]),
      lessons: cleanBulletPoints(sections[1]),
      mistakes: cleanBulletPoints(sections[2])
    };
  } catch (error) {
    console.error('Error generating trade feedback:', error);
    throw new Error('Failed to generate trade feedback');
  }
} 