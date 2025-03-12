import React from 'react';
import { PortfolioPerformance } from '../../../types/investment';
import { Line } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

interface PortfolioSummaryProps {
    performance: PortfolioPerformance;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ performance }) => {
    const {
        totalValue,
        totalCost,
        totalGainLoss,
        totalGainLossPercentage,
        spyPerformance
    } = performance;

    const performanceData = {
        labels: ['Portfolio', 'S&P 500'],
        datasets: [
            {
                label: 'Performance (%)',
                data: [totalGainLossPercentage, spyPerformance],
                backgroundColor: [
                    'rgba(75, 192, 192, 0.2)',
                    'rgba(54, 162, 235, 0.2)',
                ],
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(54, 162, 235, 1)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top' as const,
            },
            title: {
                display: true,
                text: 'Portfolio vs S&P 500 Performance',
            },
        },
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-4">Portfolio Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
                    <p className="text-2xl font-bold text-gray-900">${totalValue.toFixed(2)}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
                    <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">Total Gain/Loss</h3>
                    <p className={`text-2xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {totalGainLoss >= 0 ? '+' : ''}{totalGainLoss.toFixed(2)} ({totalGainLossPercentage >= 0 ? '+' : ''}{totalGainLossPercentage.toFixed(2)}%)
                    </p>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500">S&P 500 Performance</h3>
                    <p className={`text-2xl font-bold ${spyPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {spyPerformance >= 0 ? '+' : ''}{spyPerformance.toFixed(2)}%
                    </p>
                </div>
            </div>

            <div className="h-64">
                <Line options={options} data={performanceData} />
            </div>
        </div>
    );
}; 