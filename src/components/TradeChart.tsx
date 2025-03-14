import { useEffect, useRef } from 'react';
import { 
  createChart, 
  ColorType, 
  CrosshairMode,
  IChartApi,
  LineStyle,
  Time,
  CandlestickSeries,
  SeriesMarker,
  createSeriesMarkers
} from 'lightweight-charts';
import type { Trade } from '../services/supabase';

interface TradeChartProps {
  trade: Trade;
  candleData?: {
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
  }[];
}

const TradeChart: React.FC<TradeChartProps> = ({ trade, candleData }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartContainerRef.current || !candleData) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111827' },
        textColor: '#9CA3AF',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
      crosshair: {
        mode: CrosshairMode.Normal,
      },
      grid: {
        vertLines: { color: '#1F2937' },
        horzLines: { color: '#1F2937' },
      },
      timeScale: {
        borderColor: '#374151',
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: '#374151',
      },
    });

    // Add candlestick series
    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#EF4444',
    });

    // Set the data
    candlestickSeries.setData(candleData.map(d => ({
      ...d,
      time: d.time as Time
    })));

    // Create markers array
    const markers: SeriesMarker<Time>[] = [];
    
    // Add entry marker
    if (trade.entry_price && trade.entry_date) {
      markers.push({
        time: trade.entry_date as Time,
        position: 'belowBar',
        color: trade.type === 'long' ? '#22c55e' : '#ef4444',
        shape: 'arrowUp',
        text: `Entry: ${trade.entry_price}`,
      });
    }

    // Add exit marker
    if (trade.status === 'closed' && trade.exit_date && trade.exit_price) {
      markers.push({
        time: trade.exit_date as Time,
        position: 'aboveBar',
        color: trade.type === 'long' ? '#22c55e' : '#ef4444',
        shape: 'arrowDown',
        text: `Exit: ${trade.exit_price}`,
      });

      // Add vertical line at exit
      candlestickSeries.createPriceLine({
        price: Number(trade.exit_price),
        color: 'rgba(119, 119, 119, 0.5)',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: 'Exit Point',
      });
    }

    // Add markers to series
    createSeriesMarkers(candlestickSeries, markers);

    // Add price lines for entry, stop loss, and take profit
    if (trade.entry_price) {
      const entryPrice = Number(trade.entry_price);
      if (!isNaN(entryPrice)) {
        candlestickSeries.createPriceLine({
          price: entryPrice,
          color: trade.type === 'long' ? '#22c55e' : '#ef4444',
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title: 'Entry',
        });
      }
    }

    // Add stop loss line if available
    if (trade.stop_loss) {
      const stopLossPrice = Number(trade.stop_loss);
      if (!isNaN(stopLossPrice)) {
        candlestickSeries.createPriceLine({
          price: stopLossPrice,
          color: '#ef4444',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Stop Loss',
        });
      }
    }

    // Add take profit line if available
    if (trade.take_profit) {
      const takeProfitPrice = Number(trade.take_profit);
      if (!isNaN(takeProfitPrice)) {
        candlestickSeries.createPriceLine({
          price: takeProfitPrice,
          color: '#22c55e',
          lineWidth: 1,
          lineStyle: LineStyle.Dashed,
          axisLabelVisible: true,
          title: 'Take Profit',
        });
      }
    }

    // If trade is closed, ensure we show 2 weeks after exit
    if (trade.status === 'closed' && trade.exit_date) {
      const exitDate = new Date(trade.exit_date);
      const twoWeeksAfter = new Date(exitDate);
      twoWeeksAfter.setDate(twoWeeksAfter.getDate() + 14);
      const entryDate = new Date(trade.entry_date as string);
      // Add buffer days before entry
      const startDate = new Date(entryDate);
      startDate.setDate(startDate.getDate() - 2);
      
      chart.timeScale().setVisibleRange({
        from: startDate.toISOString().split('T')[0],
        to: twoWeeksAfter.toISOString().split('T')[0],
      });

      // Ensure the chart has enough data points
      if (candleData) {
        const lastDataPoint = new Date(candleData[candleData.length - 1].time);
        if (lastDataPoint < twoWeeksAfter) {
          console.warn('Warning: Not enough data points to show 2 weeks after exit. Last available data point:', lastDataPoint.toISOString());
        }
      }
    } else {
      // If trade is still open, fit all content
      chart.timeScale().fitContent();
    }

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    // Store chart reference for cleanup
    chartRef.current = chart;

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [trade, candleData]);

  return (
    <div className="bg-gray-900 rounded-xl shadow-lg p-4">
      <div ref={chartContainerRef} className="w-full" />
    </div>
  );
};

export default TradeChart; 