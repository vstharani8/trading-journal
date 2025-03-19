import { Trade } from '../../types/trade';
import OpenAI from 'openai';

interface TradeFeedback {
  performance: string;
  lessons: string;
  mistakes: string;
}

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

// Standard sections for analysis
const ANALYSIS_SECTIONS = {
  performance: [
    'Entry and exit execution quality',
    'Profit/loss analysis',
    'Risk management effectiveness',
    'Position sizing and risk/reward ratio',
    'Exit strategy execution'
  ],
  lessons: [
    'Strategy execution quality',
    'Setup recognition accuracy',
    'Trade management decisions',
    'Position sizing appropriateness'
  ],
  mistakes: [
    'Emotional state impact',
    'Trading plan adherence',
    'Risk management discipline',
    'Areas of psychological improvement'
  ]
};

export async function generateTradeFeedback(trade: Trade): Promise<TradeFeedback> {
  // Calculate key metrics
  const lastExit = trade.exits[trade.exits.length - 1];
  const exitPrice = lastExit?.exit_price || trade.exit_price || 0;
  const profitLoss = trade.type === 'long'
    ? (exitPrice - (trade.entry_price || 0)) * trade.quantity
    : ((trade.entry_price || 0) - exitPrice) * trade.quantity;
  
  const isProfitable = profitLoss > 0;
  const profitLossPercentage = ((exitPrice - (trade.entry_price || 0)) / (trade.entry_price || 1)) * 100;
  
  // Calculate risk metrics
  const riskPerShare = trade.stop_loss 
    ? Math.abs((trade.entry_price || 0) - trade.stop_loss)
    : 0;
  const potentialRewardPerShare = trade.take_profit
    ? Math.abs(trade.take_profit - (trade.entry_price || 0))
    : 0;
  const riskRewardRatio = riskPerShare > 0 ? potentialRewardPerShare / riskPerShare : 0;

  // Calculate exit execution metrics
  const exitMetrics = trade.exits.map(exit => ({
    date: exit.exit_date,
    price: exit.exit_price,
    quantity: exit.quantity,
    pnl: trade.type === 'long'
      ? (exit.exit_price - (trade.entry_price || 0)) * exit.quantity
      : ((trade.entry_price || 0) - exit.exit_price) * exit.quantity,
    notes: exit.notes,
    trigger: exit.exit_trigger
  }));

  // Calculate average exit metrics
  const totalExitQuantity = exitMetrics.reduce((sum, exit) => sum + exit.quantity, 0);
  const weightedAvgExitPrice = exitMetrics.reduce((sum, exit) => 
    sum + (exit.price * exit.quantity), 0) / totalExitQuantity;

  // Prepare comprehensive trade context for analysis
  const tradeContext = {
    // Basic trade info
    symbol: trade.symbol,
    type: trade.type,
    market: trade.market,
    status: trade.status,
    
    // Entry details
    entry_date: trade.entry_date,
    entry_price: trade.entry_price,
    quantity: trade.quantity,
    remaining_quantity: trade.remaining_quantity,
    
    // Exit details
    exit_date: trade.exit_date,
    exit_price: exitPrice,
    weighted_avg_exit_price: weightedAvgExitPrice,
    exits: exitMetrics,
    exit_trigger: trade.exit_trigger,
    
    // Performance metrics
    profit_loss: profitLoss,
    profit_loss_percentage: profitLossPercentage,
    fees: trade.fees,
    
    // Risk management
    risk_reward_ratio: riskRewardRatio,
    stop_loss: trade.stop_loss,
    take_profit: trade.take_profit,
    risk_per_share: riskPerShare,
    potential_reward_per_share: potentialRewardPerShare,
    
    // Trade context
    market_conditions: trade.market_conditions,
    emotional_state: trade.emotional_state,
    trade_setup: trade.trade_setup,
    strategy: trade.strategy,
    
    // Analysis fields
    proficiency: trade.proficiency,
    growth_areas: trade.growth_areas,
    
    // Additional context
    notes: trade.notes
  };

  try {
    // Generate comprehensive analysis using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert trading analyst providing detailed trade analysis. Your analysis must follow this exact format for each section:

Performance Analysis:
${ANALYSIS_SECTIONS.performance.map(item => `- ${item}: [Your specific analysis]`).join('\n')}

What Worked Well:
${ANALYSIS_SECTIONS.lessons.map(item => `- ${item}: [Your specific analysis]`).join('\n')}

Areas to Improve:
${ANALYSIS_SECTIONS.mistakes.map(item => `- ${item}: [Your specific analysis]`).join('\n')}

Keep each point concise, specific, and actionable. Use the provided trade metrics and context to inform your analysis.
Ensure each section follows the exact structure above, with all points addressed in the same order.`
        },
        {
          role: "user",
          content: `Analyze this trade following the exact format specified:
          ${JSON.stringify(tradeContext, null, 2)}`
        }
      ],
      temperature: 0.3, // Lower temperature for more consistent outputs
      max_tokens: 1500
    });

    const analysis = completion.choices[0]?.message?.content;
    if (!analysis) {
      throw new Error('Failed to generate analysis');
    }

    // Parse the analysis into sections using the standardized format
    const sections = analysis.split('\n\n');
    
    // Helper function to extract points from a section
    const extractPoints = (section: string): string => {
      const points = section.split('\n')
        .filter(line => line.trim().startsWith('-'))
        .map(line => line.trim())
        .join('\n');
      return points || 'Analysis not available';
    };

    // Extract each section ensuring consistent format
    const performance = sections.find(s => s.toLowerCase().includes('performance analysis'))
      ? extractPoints(sections.find(s => s.toLowerCase().includes('performance analysis')) || '')
      : ANALYSIS_SECTIONS.performance.map(item => `- ${item}: No analysis available`).join('\n');
    
    const lessons = sections.find(s => s.toLowerCase().includes('what worked well'))
      ? extractPoints(sections.find(s => s.toLowerCase().includes('what worked well')) || '')
      : ANALYSIS_SECTIONS.lessons.map(item => `- ${item}: No analysis available`).join('\n');
    
    const mistakes = sections.find(s => s.toLowerCase().includes('areas to improve'))
      ? extractPoints(sections.find(s => s.toLowerCase().includes('areas to improve')) || '')
      : ANALYSIS_SECTIONS.mistakes.map(item => `- ${item}: No analysis available`).join('\n');

    return {
      performance,
      lessons,
      mistakes
    };
  } catch (error) {
    console.error('Error generating trade feedback:', error);
    // Fallback to standardized basic analysis
    return {
      performance: ANALYSIS_SECTIONS.performance
        .map(item => `- ${item}: ${isProfitable ? 'Executed according to plan' : 'Needs improvement'}`).join('\n'),
      lessons: ANALYSIS_SECTIONS.lessons
        .map(item => `- ${item}: ${isProfitable ? 'Successfully implemented' : 'Review and adjust'}`).join('\n'),
      mistakes: ANALYSIS_SECTIONS.mistakes
        .map(item => `- ${item}: ${isProfitable ? 'No major issues identified' : 'Requires attention'}`).join('\n')
    };
  }
} 