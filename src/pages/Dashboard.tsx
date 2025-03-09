import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/supabase';
import type { Trade } from '../services/supabase';

interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalProfitLoss: number;
  averageRR: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalTrades: 0,
    winRate: 0,
    totalProfitLoss: 0,
    averageRR: 0,
    bestTrade: null,
    worstTrade: null,
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const trades = await db.getAllTrades();
      
      // Calculate dashboard statistics
      const closedTrades = trades.filter(trade => trade.status === 'closed');
      const profitableTrades = closedTrades.filter(trade => 
        trade.exit_price && trade.entry_price && 
        (trade.type === 'long' ? trade.exit_price > trade.entry_price : trade.exit_price < trade.entry_price)
      );

      const totalPL = closedTrades.reduce((sum, trade) => {
        if (!trade.exit_price || !trade.entry_price) return sum;
        const pl = trade.type === 'long'
          ? (trade.exit_price - trade.entry_price) * trade.quantity
          : (trade.entry_price - trade.exit_price) * trade.quantity;
        return sum + pl;
      }, 0);

      const averageRR = closedTrades.reduce((sum, trade) => {
        if (!trade.exit_price || !trade.entry_price || !trade.stop_loss) return sum;
        const risk = trade.type === 'long'
          ? trade.entry_price - trade.stop_loss
          : trade.stop_loss - trade.entry_price;
        const reward = trade.type === 'long'
          ? trade.exit_price - trade.entry_price
          : trade.entry_price - trade.exit_price;
        return risk > 0 ? sum + (reward / risk) : sum;
      }, 0) / (closedTrades.length || 1);

      setStats({
        totalTrades: trades.length,
        winRate: closedTrades.length ? (profitableTrades.length / closedTrades.length) * 100 : 0,
        totalProfitLoss: totalPL,
        averageRR: averageRR,
        bestTrade: profitableTrades.reduce((best, trade) => {
          if (!best) return trade;
          const currentPL = trade.exit_price && trade.entry_price
            ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
            : 0;
          const bestPL = best.exit_price && best.entry_price
            ? ((best.exit_price - best.entry_price) / best.entry_price) * 100
            : 0;
          return currentPL > bestPL ? trade : best;
        }, null as Trade | null),
        worstTrade: closedTrades.reduce((worst, trade) => {
          if (!worst) return trade;
          const currentPL = trade.exit_price && trade.entry_price
            ? ((trade.exit_price - trade.entry_price) / trade.entry_price) * 100
            : 0;
          const worstPL = worst.exit_price && worst.entry_price
            ? ((worst.exit_price - worst.entry_price) / worst.entry_price) * 100
            : 0;
          return currentPL < worstPL ? trade : worst;
        }, null as Trade | null),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <Link
            to="/trade/new"
            className="inline-flex items-center px-6 py-3 border border-transparent text-sm font-medium rounded-lg text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
          >
            + New Trade
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Total Trades</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">{stats.totalTrades}</p>
          </div>

          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Win Rate</h3>
            <p className="mt-2 text-3xl font-bold text-indigo-600">
              {stats.winRate.toFixed(1)}%
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Total P/L</h3>
            <p className={`mt-2 text-3xl font-bold ${
              stats.totalProfitLoss > 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              ${stats.totalProfitLoss.toFixed(2)}
            </p>
          </div>

          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Avg R:R Ratio</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              1:{stats.averageRR.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Best and Worst Trades */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Best Trade</h3>
            {stats.bestTrade ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600">{stats.bestTrade.symbol}</p>
                <p className="text-2xl font-bold text-green-600">
                  {stats.bestTrade.exit_price && stats.bestTrade.entry_price
                    ? `+${(((stats.bestTrade.exit_price - stats.bestTrade.entry_price) / stats.bestTrade.entry_price) * 100).toFixed(2)}%`
                    : 'N/A'}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No trades yet</p>
            )}
          </div>

          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Worst Trade</h3>
            {stats.worstTrade ? (
              <div className="mt-2 space-y-2">
                <p className="text-sm text-gray-600">{stats.worstTrade.symbol}</p>
                <p className="text-2xl font-bold text-red-600">
                  {stats.worstTrade.exit_price && stats.worstTrade.entry_price
                    ? `${(((stats.worstTrade.exit_price - stats.worstTrade.entry_price) / stats.worstTrade.entry_price) * 100).toFixed(2)}%`
                    : 'N/A'}
                </p>
              </div>
            ) : (
              <p className="mt-2 text-sm text-gray-500">No trades yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 