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
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    // Format percentage values
    const formatPercentage = (value: number) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    return (
        <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
            <div className="px-6 py-4">
                <h2 className="text-2xl font-bold text-white">Portfolio Summary</h2>
            </div>
            
            <div className="bg-white p-6">
                <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
                        <div className="flex items-baseline">
                            <p className="text-3xl font-bold text-gray-900">
                                {formatCurrency(totalValue)}
                            </p>
                        </div>
                        <p className="text-sm text-gray-500">Current portfolio value</p>
                    </div>
                    
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-500">Total Cost</h3>
                        <div className="flex items-baseline">
                            <p className="text-3xl font-bold text-gray-900">
                                {formatCurrency(totalCost)}
                            </p>
                        </div>
                        <p className="text-sm text-gray-500">Initial investment</p>
                    </div>
                    
                    <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-500">Total Gain/Loss</h3>
                        <div className="flex flex-col">
                            <div className="flex items-baseline gap-3">
                                <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(totalGainLoss)}
                                </p>
                                <p className={`text-xl font-semibold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ({formatPercentage(totalGainLossPercentage)})
                                </p>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500">Total return</p>
                    </div>
                </div>
            </div>
        </div>
    );
}; 