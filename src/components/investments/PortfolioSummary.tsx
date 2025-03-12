import React, { useState } from 'react';
import { PortfolioPerformance } from '../../../types/investment';

interface PortfolioSummaryProps {
    performance: PortfolioPerformance;
}

export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ performance }) => {
    const [showAnalysis, setShowAnalysis] = useState(false);

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

    // Generate basic analysis
    const getAnalysis = (): string[] => {
        if (totalValue === 0) {
            return ["Add investments to see portfolio analysis."];
        }

        const analysis: string[] = [];
        
        // Performance analysis
        if (totalGainLossPercentage > 5) {
            analysis.push("Strong portfolio performance with significant gains.");
        } else if (totalGainLossPercentage > 0) {
            analysis.push("Portfolio showing positive returns.");
        } else if (totalGainLossPercentage > -5) {
            analysis.push("Minor losses in portfolio value.");
        } else {
            analysis.push("Significant portfolio losses. Consider reviewing investment strategy.");
        }

        // Investment size analysis
        if (totalValue < 1000) {
            analysis.push("Consider increasing investment size for better diversification opportunities.");
        }

        // Return on Investment (ROI) analysis
        const roi = (totalGainLoss / totalCost) * 100;
        if (roi > 10) {
            analysis.push("Excellent ROI. Current strategy is working well.");
        } else if (roi > 5) {
            analysis.push("Good ROI. Strategy is showing positive results.");
        } else if (roi > 0) {
            analysis.push("Positive but modest returns. Consider optimizing strategy.");
        } else {
            analysis.push("Negative ROI. Review and adjust investment approach.");
        }

        return analysis;
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg overflow-hidden">
                <div className="px-6 py-4">
                    <h2 className="text-2xl font-bold text-white">Portfolio Summary</h2>
                </div>
                
                <div className="bg-white p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Value</h3>
                            <div className="flex items-baseline">
                                <p className="text-3xl font-bold text-gray-900">
                                    {formatCurrency(totalValue)}
                                </p>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Current portfolio value</p>
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Cost</h3>
                            <div className="flex items-baseline">
                                <p className="text-3xl font-bold text-gray-900">
                                    {formatCurrency(totalCost)}
                                </p>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Initial investment</p>
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-medium text-gray-500 mb-1">Total Gain/Loss</h3>
                            <div className="flex items-baseline gap-3">
                                <p className={`text-3xl font-bold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {formatCurrency(totalGainLoss)}
                                </p>
                                <p className={`text-xl font-semibold ${totalGainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ({formatPercentage(totalGainLossPercentage)})
                                </p>
                            </div>
                            <p className="text-sm text-gray-500 mt-1">Total return</p>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-center">
                        <button
                            onClick={() => setShowAnalysis(!showAnalysis)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                        >
                            {showAnalysis ? 'Hide Analysis' : 'Generate Analysis'}
                            <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>

            {showAnalysis && (
                <div className="bg-white rounded-xl shadow-lg overflow-hidden animate-fade-in">
                    <div className="px-6 py-4">
                        <h2 className="text-2xl font-bold text-gray-900">Portfolio Analysis</h2>
                    </div>
                    <div className="px-6 pb-6">
                        <div className="space-y-4">
                            {getAnalysis().map((insight: string, index: number) => (
                                <div key={index} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 mt-1">
                                        <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-700">{insight}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}; 