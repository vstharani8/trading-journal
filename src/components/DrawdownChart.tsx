import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import { format, differenceInDays, isValid } from 'date-fns';
import type { Trade } from '../services/supabase';

// Define TradeExit interface
interface TradeExit {
  id: string;
  trade_id: string;
  exit_date: string;
  exit_price: number;
  quantity: number;
  fees?: number;
  notes?: string;
  exit_trigger?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Extend the Trade type to match DashboardTrade
interface DashboardTrade extends Omit<Trade, 'proficiency' | 'growth_areas' | 'exit_trigger'> {
  proficiency: string | null;
  growth_areas: string | null;
  exit_trigger: string | null;
  portfolioImpact: number;
  calculatedPL: number;
  exits: TradeExit[];
}

interface DrawdownChartProps {
  trades: DashboardTrade[];
  initialCapital: number;
}

interface DrawdownPoint {
  date: string;
  drawdown: number;
  equity: number;
}

interface DrawdownStats {
  maxDrawdown: number;
  maxDrawdownDate: string;
  recoveryPeriod: number;
  currentDrawdown: number;
  longestDrawdownPeriod: number;
  averageDrawdown: number;
}

const DrawdownChart: React.FC<DrawdownChartProps> = ({ trades, initialCapital }) => {
  const [drawdownData, setDrawdownData] = useState<DrawdownPoint[]>([]);
  const [drawdownStats, setDrawdownStats] = useState<DrawdownStats>({
    maxDrawdown: 0,
    maxDrawdownDate: '',
    recoveryPeriod: 0,
    currentDrawdown: 0,
    longestDrawdownPeriod: 0,
    averageDrawdown: 0
  });

  // Helper function to safely format dates
  const safeFormatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (!isValid(date)) {
        console.warn('Invalid date:', dateString);
        return 'Invalid Date';
      }
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      console.warn('Error formatting date:', dateString, error);
      return 'Invalid Date';
    }
  };

  // Helper function to safely calculate date difference
  const safeCalculateDaysDifference = (date1: string, date2: string): number => {
    try {
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      if (!isValid(d1) || !isValid(d2)) {
        console.warn('Invalid date in difference calculation:', { date1, date2 });
        return 0;
      }
      return differenceInDays(d1, d2);
    } catch (error) {
      console.warn('Error calculating date difference:', { date1, date2 }, error);
      return 0;
    }
  };

  useEffect(() => {
    calculateDrawdown();
  }, [trades, initialCapital]);

  const calculateDrawdown = () => {
    if (!trades.length) return;

    // Sort trades by date and filter out invalid dates
    const sortedTrades = [...trades]
      .filter(trade => {
        const date = new Date(trade.entry_date);
        if (!isValid(date)) {
          console.warn('Filtered out trade with invalid date:', trade);
          return false;
        }
        return true;
      })
      .sort((a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime());

    if (!sortedTrades.length) {
      console.warn('No valid trades after filtering');
      return;
    }

    let equity = initialCapital;
    let peakEquity = initialCapital;
    let currentDrawdown = 0;
    let maxDrawdownValue = 0;
    let maxDrawdownDate = '';
    let drawdownStartDate = '';
    let longestDrawdownPeriod = 0;
    let totalDrawdown = 0;
    let drawdownCount = 0;
    const drawdownPoints: DrawdownPoint[] = [];

    // Calculate equity and drawdown for each trade
    sortedTrades.forEach(trade => {
      let profitLoss = 0;
      
      if (trade.exits && trade.exits.length > 0) {
        profitLoss = trade.exits.reduce((sum, exit) => {
          const exitPL = trade.type === 'long'
            ? (exit.exit_price - (trade.entry_price || 0)) * exit.quantity
            : ((trade.entry_price || 0) - exit.exit_price) * exit.quantity;
          return sum + exitPL - (exit.fees || 0);
        }, 0);
      } else if (trade.exit_price && trade.entry_price) {
        profitLoss = trade.type === 'long'
          ? (trade.exit_price - trade.entry_price) * trade.quantity
          : (trade.entry_price - trade.exit_price) * trade.quantity;
        profitLoss -= (trade.fees || 0);
      }

      equity += profitLoss;

      // Update peak equity and track drawdown periods
      if (equity > peakEquity) {
        peakEquity = equity;
        // If we were in a drawdown, calculate its duration
        if (drawdownStartDate) {
          const drawdownDuration = safeCalculateDaysDifference(trade.entry_date, drawdownStartDate);
          longestDrawdownPeriod = Math.max(longestDrawdownPeriod, drawdownDuration);
          drawdownStartDate = '';
        }
      }

      // Calculate current drawdown as percentage
      currentDrawdown = ((peakEquity - equity) / peakEquity) * 100;

      // Track drawdown statistics
      if (currentDrawdown > 0) {
        if (!drawdownStartDate) {
          drawdownStartDate = trade.entry_date;
        }
        totalDrawdown += currentDrawdown;
        drawdownCount++;
      }

      // Update max drawdown if current drawdown is larger
      if (currentDrawdown > maxDrawdownValue) {
        maxDrawdownValue = currentDrawdown;
        maxDrawdownDate = trade.entry_date;
      }

      // Add point to drawdown data
      const formattedDate = safeFormatDate(trade.entry_date);
      if (formattedDate !== 'Invalid Date') {
        drawdownPoints.push({
          date: formattedDate,
          drawdown: -currentDrawdown,
          equity: equity
        });
      }
    });

    // Calculate recovery period if we have a max drawdown
    let recoveryPeriod = 0;
    if (maxDrawdownDate) {
      const formattedMaxDrawdownDate = safeFormatDate(maxDrawdownDate);
      const maxDrawdownIndex = drawdownPoints.findIndex(
        point => point.date === formattedMaxDrawdownDate
      );
      
      if (maxDrawdownIndex !== -1) {
        // Find when we recovered from the max drawdown
        for (let i = maxDrawdownIndex + 1; i < drawdownPoints.length; i++) {
          if (drawdownPoints[i].drawdown === 0) {
            recoveryPeriod = i - maxDrawdownIndex;
            break;
          }
        }
      }
    }

    setDrawdownData(drawdownPoints);
    setDrawdownStats({
      maxDrawdown: maxDrawdownValue,
      maxDrawdownDate: maxDrawdownDate ? safeFormatDate(maxDrawdownDate) : '',
      recoveryPeriod: recoveryPeriod,
      currentDrawdown: currentDrawdown,
      longestDrawdownPeriod: longestDrawdownPeriod,
      averageDrawdown: drawdownCount > 0 ? totalDrawdown / drawdownCount : 0
    });
  };

  const getRiskLevel = (drawdown: number): string => {
    if (drawdown <= 5) return 'Low';
    if (drawdown <= 15) return 'Moderate';
    return 'High';
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Drawdown Analysis</h3>
        <p className="text-sm text-gray-500 mt-1">
          Track your portfolio's value declines from peak levels
        </p>
      </div>

      {/* Drawdown Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500">Maximum Drawdown</h4>
          <div className={`mt-1 text-2xl font-bold ${drawdownStats.maxDrawdown > 15 ? 'text-red-600' : drawdownStats.maxDrawdown > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
            {drawdownStats.maxDrawdown.toFixed(2)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Risk Level: {getRiskLevel(drawdownStats.maxDrawdown)}
          </p>
          <p className="text-xs text-gray-500">
            Occurred on {drawdownStats.maxDrawdownDate}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500">Current Drawdown</h4>
          <div className={`mt-1 text-2xl font-bold ${drawdownStats.currentDrawdown > 15 ? 'text-red-600' : drawdownStats.currentDrawdown > 5 ? 'text-yellow-600' : 'text-green-600'}`}>
            {drawdownStats.currentDrawdown.toFixed(2)}%
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Risk Level: {getRiskLevel(drawdownStats.currentDrawdown)}
          </p>
          <p className="text-xs text-gray-500">
            {drawdownStats.currentDrawdown === 0 ? 'Currently at peak equity' : 'Distance from peak equity'}
          </p>
        </div>

        <div className="bg-white rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-medium text-gray-500">Recovery Metrics</h4>
          <div className="mt-1 text-2xl font-bold text-blue-600">
            {drawdownStats.recoveryPeriod} trades
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Average recovery time from drawdowns
          </p>
          <p className="text-xs text-gray-500">
            Longest drawdown: {drawdownStats.longestDrawdownPeriod} days
          </p>
        </div>
      </div>

      {/* Insights Panel */}
      <div className="bg-indigo-50 rounded-lg p-4 mb-6">
        <h4 className="text-sm font-medium text-indigo-900 mb-2">Analysis Insights</h4>
        <ul className="text-sm text-indigo-800 space-y-1">
          <li>• Your maximum drawdown of {drawdownStats.maxDrawdown.toFixed(2)}% indicates a {getRiskLevel(drawdownStats.maxDrawdown).toLowerCase()} risk profile</li>
          {drawdownStats.currentDrawdown > 0 && (
            <li>• Currently experiencing a {drawdownStats.currentDrawdown.toFixed(2)}% drawdown from peak equity</li>
          )}
          <li>• Average drawdown recovery takes {drawdownStats.recoveryPeriod} trades</li>
          {drawdownStats.longestDrawdownPeriod > 0 && (
            <li>• Longest drawdown period lasted {drawdownStats.longestDrawdownPeriod} days</li>
          )}
          {drawdownStats.averageDrawdown > 0 && (
            <li>• Average drawdown depth is {drawdownStats.averageDrawdown.toFixed(2)}%</li>
          )}
        </ul>
      </div>

      {/* Drawdown Chart */}
      <div className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={drawdownData}
            margin={{
              top: 5,
              right: 30,
              left: 20,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              tickFormatter={(value) => `${value}%`}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              domain={['dataMin', 'dataMax']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                borderRadius: '0.5rem',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              formatter={(value: number) => [`${Math.abs(value).toFixed(2)}%`, 'Drawdown']}
            />
            <ReferenceLine y={0} stroke="#E5E7EB" />
            <Line
              type="monotone"
              dataKey="drawdown"
              stroke="#EF4444"
              strokeWidth={2}
              dot={false}
              name="Drawdown"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DrawdownChart; 