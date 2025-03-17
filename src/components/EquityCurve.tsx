import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { format } from 'date-fns';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface EquityCurveProps {
  trades: Array<{
    entry_date: string;
    entry_price: number | null;
    exit_price?: number | null;
    quantity: number;
    type: 'long' | 'short';
    fees?: number;
    exits?: Array<{
      exit_date: string;
      exit_price: number;
      quantity: number;
      fees?: number;
    }>;
  }>;
  initialCapital: number;
}

const EquityCurve: React.FC<EquityCurveProps> = ({ trades, initialCapital }) => {
  // Sort trades by date
  const sortedTrades = [...trades].sort(
    (a, b) => new Date(a.entry_date).getTime() - new Date(b.entry_date).getTime()
  );

  // Calculate cumulative equity
  const equityPoints = sortedTrades.reduce((acc, trade) => {
    const lastEquity = acc.length > 0 ? acc[acc.length - 1].y : initialCapital;
    
    // Handle multiple exits
    let profitLoss = 0;
    
    if (trade.exits && trade.exits.length > 0) {
      // Calculate P/L from all exits
      profitLoss = trade.exits.reduce((sum, exit) => {
        const exitPL = trade.type === 'long'
          ? (exit.exit_price - (trade.entry_price || 0)) * exit.quantity
          : ((trade.entry_price || 0) - exit.exit_price) * exit.quantity;
        return sum + exitPL - (exit.fees || 0);
      }, 0);
    } else if (trade.exit_price && trade.entry_price) {
      // Legacy calculation for trades without exits array
      profitLoss = trade.type === 'long'
        ? (trade.exit_price - trade.entry_price) * trade.quantity
        : (trade.entry_price - trade.exit_price) * trade.quantity;
      
      // Subtract fees
      profitLoss -= (trade.fees || 0);
    }
    
    return [...acc, {
      x: format(new Date(trade.entry_date), 'MMM d, yyyy'),
      y: lastEquity + profitLoss
    }];
  }, [] as Array<{x: string, y: number}>);

  const data = {
    labels: equityPoints.map(point => point.x),
    datasets: [
      {
        label: 'Account Equity',
        data: equityPoints.map(point => point.y),
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 6,
      }
    ]
  };

  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Equity Curve',
        color: '#374151',
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (context) => `Equity: $${context.parsed.y.toFixed(2)}`
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        beginAtZero: false,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: (value) => `$${value}`
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  };

  return (
    <div className="w-full h-[400px] bg-white/70 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/20">
      <Line data={data} options={options} />
    </div>
  );
};

export default EquityCurve; 