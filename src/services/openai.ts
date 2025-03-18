import { Trade } from '../../types/trade';

interface TradeFeedback {
  performance: string;
  lessons: string;
  mistakes: string;
}

export async function generateTradeFeedback(trade: Trade): Promise<TradeFeedback> {
  // For now, return mock feedback
  const lastExit = trade.exits[trade.exits.length - 1];
  const exitPrice = lastExit?.exit_price || 0;
  const profitLoss = trade.type === 'long'
    ? (exitPrice - (trade.entry_price || 0)) * trade.quantity
    : ((trade.entry_price || 0) - exitPrice) * trade.quantity;

  const isProfitable = profitLoss > 0;
  
  return {
    performance: `Trade ${isProfitable ? 'profitable' : 'unprofitable'} with ${Math.abs(profitLoss).toFixed(2)} ${trade.type === 'long' ? 'long' : 'short'} position in ${trade.symbol}. Entry at ${trade.entry_price}, exit at ${exitPrice}.`,
    lessons: isProfitable 
      ? 'Good trade execution and risk management.'
      : 'Consider reviewing entry criteria and position sizing.',
    mistakes: isProfitable
      ? 'No major mistakes identified.'
      : 'Review stop loss placement and market conditions before entry.'
  };
} 