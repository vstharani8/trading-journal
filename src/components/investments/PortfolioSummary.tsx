import React from 'react';
import { PortfolioPerformance } from '../../../types/investment';

interface PortfolioSummaryProps {
    performance: PortfolioPerformance;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ performance }) => {
    // Ensure we have default values if performance is undefined
    const {
        totalValue = 0,
        totalCost = 0,
        totalGainLoss = 0,
        totalGainLossPercentage = 0
    } = performance || {};

    // Format currency values
    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(value);
    };

    // Format percentage values
    const formatPercentage = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-indigo-500 to-purple-600">
                <h2 className="text-2xl font-bold text-white">Portfolio Summary</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
                <div className="p-6 space-y-1">
                    <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
                    <div className="flex items-baseline">
                        <p className="text-3xl font-bold text-gray-900">
                            {formatCurrency(totalValue)}
                        </p>
                    </div>
                    <p className="text-sm text-gray-500">Current portfolio value</p>
                </div>
                
                <div className="p-6 space-y-1">
                    <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
                    <div className="flex items-baseline">
                        <p className="text-3xl font-bold text-gray-900">
                            {formatCurrency(totalCost)}
                        </p>
                    </div>
                    <p className="text-sm text-gray-500">Initial investment</p>
                </div>
                
                <div className="p-6 space-y-1">
                    <h3 className="text-sm font-medium text-gray-500">Total Gain/Loss</h3>
                    <div className="flex items-baseline space-x-2">
                        <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(totalGainLoss)}
                        </p>
                        <p className={`text-lg font-semibold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ({formatPercentage(totalGainLossPercentage)})
                        </p>
                    </div>
                    <p className="text-sm text-gray-500">Total return</p>
                </div>
            </div>
        </div>
    );
}; 