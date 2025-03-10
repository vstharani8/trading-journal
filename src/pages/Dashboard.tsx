import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../services/supabase';
import type { Trade as BaseTradeType, UserSettings } from '../services/supabase';
import EquityCurve from '../components/EquityCurve';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isWithinInterval } from 'date-fns';

interface Trade extends BaseTradeType {
  proficiency?: string | null;
  growth_areas?: string | null;
  exit_trigger?: string | null;
  portfolioImpact?: number;
}

interface DashboardStats {
  totalTrades: number;
  winRate: number;
  totalProfitLoss: number;
  averageRR: number;
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

interface MonthlyData {
  month: string;
  profitLoss: number;
  profitLossPercentage: number;
  winRate: number;
  tradeCount: number;
  averageReturn: number;
  averageGain: number;
  averageLoss: number;
  averagePositionSize: number;
}

interface StrategyPerformance {
  name: string;
  totalTrades: number;
  winRate: number;
  profitLoss: number;
  averageReturn: number;
  averageRR: number;
  profitFactor: number;
  totalWins: number;
  totalLosses: number;
  grossProfit: number;
  grossLoss: number;
}

interface TradeAnalytics {
  name: string;
  count: number;
  profitLoss: number;
  winRate: number;
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalTrades: 0,
    winRate: 0,
    totalProfitLoss: 0,
    averageRR: 0,
    bestTrade: null,
    worstTrade: null
  });
  const [strategyPerformance, setStrategyPerformance] = useState<StrategyPerformance[]>([]);
  const [proficiencyAnalytics, setProficiencyAnalytics] = useState<TradeAnalytics[]>([]);
  const [growthAreasAnalytics, setGrowthAreasAnalytics] = useState<TradeAnalytics[]>([]);
  const [exitTriggerAnalytics, setExitTriggerAnalytics] = useState<TradeAnalytics[]>([]);

  useEffect(() => {
    loadDashboardData();
    loadUserSettings();
  }, []);

  const loadUserSettings = async () => {
    try {
      const { data: { session } } = await db.supabase.auth.getSession();
      if (session?.user) {
        const settings = await db.getUserSettings(session.user.id);
        setUserSettings(settings);
      }
    } catch (err) {
      console.error('Error loading user settings:', err);
    }
  };

  const calculateMonthlyData = (trades: Trade[]) => {
    console.log('Initial capital:', userSettings?.total_capital);
    
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    console.log('Last 6 months:', last6Months);

    const monthlyStats = last6Months.map(month => {
      const monthTrades = trades.filter(trade => {
        if (!trade.exit_date) return false;
        const tradeDate = parseISO(trade.exit_date);
        return isWithinInterval(tradeDate, {
          start: startOfMonth(month),
          end: endOfMonth(month)
        });
      });

      const closedTrades = monthTrades.filter(t => t.status === 'closed');
      
      // Calculate win rate and profitable trades
      const profitableTrades = closedTrades.filter(t => {
        if (!t.exit_price || !t.entry_price) return false;
        return t.type === 'long' 
          ? t.exit_price > t.entry_price 
          : t.exit_price < t.entry_price;
      });
      
      const winRate = closedTrades.length > 0
        ? (profitableTrades.length / closedTrades.length) * 100
        : 0;

      // Calculate gains and losses
      const gains = profitableTrades.map(t => {
        if (!t.exit_price || !t.entry_price) return 0;
        return ((t.type === 'long' ? t.exit_price - t.entry_price : t.entry_price - t.exit_price) / t.entry_price) * 100;
      });

      const losses = closedTrades
        .filter(t => !profitableTrades.includes(t))
        .map(t => {
          if (!t.exit_price || !t.entry_price) return 0;
          return ((t.type === 'long' ? t.exit_price - t.entry_price : t.entry_price - t.exit_price) / t.entry_price) * 100;
        });

      const averageGain = gains.length > 0 
        ? gains.reduce((sum, gain) => sum + gain, 0) / gains.length
        : 0;

      const averageLoss = losses.length > 0
        ? losses.reduce((sum, loss) => sum + loss, 0) / losses.length
        : 0;

      // Calculate average position size
      const averagePositionSize = closedTrades.length > 0
        ? closedTrades.reduce((sum, trade) => {
            const positionSize = (trade.quantity * trade.entry_price!) / (userSettings?.total_capital || 10000) * 100;
            return sum + positionSize;
          }, 0) / closedTrades.length
        : 0;

      const profitLoss = monthTrades.reduce((sum, trade) => {
        if (!trade.exit_price || !trade.entry_price) return sum;
        const pl = trade.type === 'long'
          ? (trade.exit_price - trade.entry_price) * trade.quantity
          : (trade.entry_price - trade.exit_price) * trade.quantity;
        return sum + pl - (trade.fees || 0);
      }, 0);

      const initialCapital = userSettings?.total_capital || 10000;
      const profitLossPercentage = (profitLoss / initialCapital) * 100;

      const averageReturn = closedTrades.length > 0
        ? profitLoss / closedTrades.length
        : 0;

      return {
        month: format(month, 'MMM yyyy'),
        profitLoss,
        profitLossPercentage,
        winRate,
        tradeCount: closedTrades.length,
        averageReturn,
        averageGain,
        averageLoss,
        averagePositionSize
      };
    });

    console.log('Monthly stats:', monthlyStats);
    setMonthlyData(monthlyStats);
  };

  useEffect(() => {
    // Recalculate monthly data when userSettings changes
    if (trades.length > 0) {
      calculateMonthlyData(trades);
    }
  }, [userSettings, trades]);

  const calculateTradeAnalytics = (trades: Trade[], field: 'proficiency' | 'growth_areas' | 'exit_trigger') => {
    const analytics = new Map<string, TradeAnalytics>();
    
    trades
      .filter(trade => trade.exit_price !== null && trade.entry_price !== null && trade[field])
      .forEach(trade => {
        const value = trade[field] || 'Unknown';
        const existing = analytics.get(value) || {
          name: value,
          count: 0,
          profitLoss: 0,
          winRate: 0
        };

        const pl = trade.type === 'long'
          ? (trade.exit_price! - trade.entry_price!) * trade.quantity
          : (trade.entry_price! - trade.exit_price!) * trade.quantity;

        const isWin = pl > 0;

        analytics.set(value, {
          ...existing,
          count: existing.count + 1,
          profitLoss: existing.profitLoss + pl,
          winRate: ((existing.winRate * existing.count) + (isWin ? 100 : 0)) / (existing.count + 1)
        });
      });

    return Array.from(analytics.values())
      .sort((a, b) => b.count - a.count);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const allTrades = await db.getAllTrades();
      
      // Calculate portfolio impact for each trade
      const tradesWithImpact = allTrades.map(trade => {
        let portfolioImpact = 0;
        if (trade.exit_price && trade.entry_price && trade.status === 'closed') {
          const pl = trade.type === 'long'
            ? (trade.exit_price - trade.entry_price) * trade.quantity
            : (trade.entry_price - trade.exit_price) * trade.quantity;
          const fees = trade.fees || 0;
          const netPL = pl - fees;
          const initialCapital = userSettings?.total_capital || 10000;
          portfolioImpact = (netPL / initialCapital) * 100;
        }
        return { ...trade, portfolioImpact };
      });

      setTrades(tradesWithImpact);
      
      // Calculate dashboard statistics
      const closedTrades = tradesWithImpact.filter(trade => trade.status === 'closed');
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
        totalTrades: allTrades.length,
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
        }, null as Trade | null)
      });

      // Calculate monthly performance data
      calculateMonthlyData(tradesWithImpact);

      // Calculate strategy performance data
      const strategyMap = new Map<string, StrategyPerformance>();
      
      tradesWithImpact
        .filter(trade => trade.exit_price !== null && trade.entry_price !== null && trade.strategy)
        .forEach(trade => {
          const strategy = trade.strategy || 'Unknown';
          const existing = strategyMap.get(strategy) || {
            name: strategy,
            totalTrades: 0,
            winRate: 0,
            profitLoss: 0,
            averageReturn: 0,
            averageRR: 0,
            profitFactor: 0,
            totalWins: 0,
            totalLosses: 0,
            grossProfit: 0,
            grossLoss: 0
          };

          const pl = trade.type === 'long'
            ? (trade.exit_price! - trade.entry_price!) * trade.quantity
            : (trade.entry_price! - trade.exit_price!) * trade.quantity;

          const isWin = pl > 0;

          strategyMap.set(strategy, {
            ...existing,
            totalTrades: existing.totalTrades + 1,
            profitLoss: existing.profitLoss + pl,
            totalWins: existing.totalWins + (isWin ? 1 : 0),
            totalLosses: existing.totalLosses + (isWin ? 0 : 1),
            grossProfit: existing.grossProfit + (pl > 0 ? pl : 0),
            grossLoss: existing.grossLoss + (pl < 0 ? Math.abs(pl) : 0)
          });
        });

      // Calculate derived metrics for each strategy
      const strategyData = Array.from(strategyMap.values()).map(strategy => ({
        ...strategy,
        winRate: (strategy.totalWins / strategy.totalTrades) * 100,
        averageReturn: strategy.profitLoss / strategy.totalTrades,
        profitFactor: strategy.grossLoss === 0 ? strategy.grossProfit : strategy.grossProfit / strategy.grossLoss
      }));

      // Sort by total profit/loss
      strategyData.sort((a, b) => b.profitLoss - a.profitLoss);
      
      setStrategyPerformance(strategyData);

      // Calculate analytics for new fields
      setProficiencyAnalytics(calculateTradeAnalytics(tradesWithImpact, 'proficiency'));
      setGrowthAreasAnalytics(calculateTradeAnalytics(tradesWithImpact, 'growth_areas'));
      setExitTriggerAnalytics(calculateTradeAnalytics(tradesWithImpact, 'exit_trigger'));

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
            <div className={`mt-2 ${stats.totalProfitLoss > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <p className="text-3xl font-bold">
                ${stats.totalProfitLoss.toFixed(2)}
              </p>
              <p className="text-lg font-semibold">
                {userSettings?.total_capital
                  ? `${((stats.totalProfitLoss / userSettings.total_capital) * 100).toFixed(2)}%`
                  : '0.00%'}
              </p>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
            <h3 className="text-lg font-medium text-gray-900">Avg R:R Ratio</h3>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              1:{stats.averageRR.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Equity Curve */}
        {userSettings && (
          <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl border border-white/20">
            <div className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Equity</h2>
              <EquityCurve 
                trades={trades} 
                initialCapital={userSettings.total_capital} 
              />
            </div>
          </div>
        )}

        {/* Monthly Performance Chart */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Profit/Loss Bar Chart */}
            <div className="h-80">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '0.5rem',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Monthly Return']}
                    />
                    <ReferenceLine y={0} stroke="#E5E7EB" />
                    <Bar
                      dataKey="profitLossPercentage"
                      name="Monthly Return"
                      fill="#6366F1"
                      radius={[4, 4, 0, 0]}
                    >
                      {monthlyData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.profitLossPercentage >= 0 ? '#10B981' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No data available for the selected period</p>
                </div>
              )}
            </div>

            {/* Win Rate and Trade Count Line Chart */}
            <div className="h-80">
              {monthlyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={monthlyData}
                    margin={{
                      top: 5,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="left"
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '0.5rem',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'Win Rate' ? `${value.toFixed(1)}%` : value,
                        name
                      ]}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="winRate"
                      name="Win Rate"
                      stroke="#6366F1"
                      strokeWidth={2}
                      dot={{ fill: '#6366F1', strokeWidth: 2 }}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="tradeCount"
                      name="Trade Count"
                      stroke="#10B981"
                      strokeWidth={2}
                      dot={{ fill: '#10B981', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-gray-500">No data available for the selected period</p>
                </div>
              )}
            </div>

            {/* Monthly Statistics */}
            <div className="lg:col-span-2 grid grid-cols-1 gap-4">
              {/* Best/Worst Month Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500">Best Month</h3>
                  {monthlyData.length > 0 ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold text-gray-900">
                        {monthlyData.reduce((best, d) => Math.max(best, d.profitLossPercentage), -Infinity).toFixed(2)}%
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {monthlyData.reduce((bestMonth, d) => 
                          d.profitLossPercentage === monthlyData.reduce((max, m) => Math.max(max, m.profitLossPercentage), -Infinity) 
                            ? d.month 
                            : bestMonth, 
                          ''
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-2xl font-semibold text-gray-900">N/A</p>
                  )}
                </div>

                <div className="bg-gradient-to-br from-red-50 to-rose-50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-500">Worst Month</h3>
                  {monthlyData.length > 0 ? (
                    <>
                      <p className="mt-2 text-2xl font-semibold text-gray-900">
                        {monthlyData.reduce((worst, d) => Math.min(worst, d.profitLossPercentage), Infinity).toFixed(2)}%
                      </p>
                      <p className="mt-1 text-sm text-gray-500">
                        {monthlyData.reduce((worstMonth, d) => 
                          d.profitLossPercentage === monthlyData.reduce((min, m) => Math.min(min, m.profitLossPercentage), Infinity) 
                            ? d.month 
                            : worstMonth, 
                          ''
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-2xl font-semibold text-gray-900">N/A</p>
                  )}
                </div>
              </div>

              {/* Monthly Statistics Table */}
              <div className="bg-white/70 backdrop-blur-lg rounded-xl shadow p-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Month</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Win %</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Gain</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Loss</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Avg Pos Size</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Trades</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {monthlyData.map((data, index) => (
                      <tr key={data.month} className={index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{data.month}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{data.winRate.toFixed(1)}%</td>
                        <td className="px-4 py-3 text-sm text-right text-green-600">
                          {data.averageGain > 0 ? `+${data.averageGain.toFixed(2)}%` : '0.00%'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-600">
                          {data.averageLoss < 0 ? `${data.averageLoss.toFixed(2)}%` : '0.00%'}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{data.averagePositionSize.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-900">{data.tradeCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Strategy Performance */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Strategy Performance</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Strategy Bar Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={strategyPerformance}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis type="number" tickFormatter={(value) => `$${value}`} />
                  <YAxis type="category" dataKey="name" width={90} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                      borderRadius: '0.5rem',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value: number, _name: string) => [
                      `$${value.toFixed(2)}`,
                      'Profit/Loss'
                    ]}
                  />
                  <Bar dataKey="profitLoss" name="Profit/Loss" radius={[0, 4, 4, 0]}>
                    {strategyPerformance.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.profitLoss >= 0 ? '#10B981' : '#EF4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Strategy Win Rate Pie Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={strategyPerformance}
                    dataKey="totalTrades"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#6366F1"
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {strategyPerformance.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={`hsl(${index * (360 / strategyPerformance.length)}, 70%, 60%)`}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, _name: string) => [
                      value,
                      'Total Trades'
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Trade Analysis */}
        <div className="bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Trade Analysis</h2>
          
          {/* Portfolio Impact Section */}
          <div className="mb-8">
            <h3 className="text-md font-medium text-gray-700 mb-4">Portfolio Impact</h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Portfolio Impact Chart */}
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={trades.filter(t => t.status === 'closed').slice(-10)}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="symbol"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tickFormatter={(value) => `${value}%`}
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        borderRadius: '0.5rem',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                      formatter={(value: number) => [`${value.toFixed(2)}%`, 'Portfolio Impact']}
                    />
                    <ReferenceLine y={0} stroke="#E5E7EB" />
                    <Bar
                      dataKey="portfolioImpact"
                      name="Portfolio Impact"
                      fill="#6366F1"
                    >
                      {trades.filter(t => t.status === 'closed').slice(-10).map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={(entry.portfolioImpact ?? 0) >= 0 ? '#10B981' : '#EF4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Portfolio Impact Stats */}
              <div className="bg-white/70 backdrop-blur-lg rounded-xl shadow p-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Symbol</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Impact</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {trades
                      .filter(t => t.status === 'closed')
                      .sort((a, b) => Math.abs(b.portfolioImpact!) - Math.abs(a.portfolioImpact!))
                      .slice(0, 5)
                      .map((trade, index) => (
                        <tr key={trade.id} className={index % 2 === 0 ? 'bg-white/50' : 'bg-gray-50/50'}>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{trade.symbol}</td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {new Date(trade.exit_date!).toLocaleDateString()}
                          </td>
                          <td className={`px-4 py-3 text-sm text-right ${(trade.portfolioImpact ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {(trade.portfolioImpact ?? 0) >= 0 ? '+' : ''}{(trade.portfolioImpact ?? 0).toFixed(2)}%
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-gray-900">
                            {trade.type.toUpperCase()}
                          </td>
                        </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Existing Trade Analysis Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Proficiency Analysis */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Proficiency Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={proficiencyAnalytics}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#6366F1"
                      label={(entry) => `${entry.name} (${entry.value})`}
                    >
                      {proficiencyAnalytics.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${index * (360 / proficiencyAnalytics.length)}, 70%, 60%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} trades`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Growth Areas Analysis */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Growth Areas Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={growthAreasAnalytics}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#6366F1"
                      label={(entry) => `${entry.name} (${entry.value})`}
                    >
                      {growthAreasAnalytics.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${index * (360 / growthAreasAnalytics.length)}, 70%, 60%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} trades`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Exit Trigger Analysis */}
            <div>
              <h3 className="text-md font-medium text-gray-700 mb-2">Exit Trigger Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={exitTriggerAnalytics}
                      dataKey="count"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#6366F1"
                      label={(entry) => `${entry.name} (${entry.value})`}
                    >
                      {exitTriggerAnalytics.map((_entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={`hsl(${index * (360 / exitTriggerAnalytics.length)}, 70%, 60%)`}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${value} trades`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
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