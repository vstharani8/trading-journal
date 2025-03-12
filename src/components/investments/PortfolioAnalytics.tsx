import React from 'react';
import { PortfolioAnalytics as PortfolioAnalyticsType } from '../../lib/services/aiAnalyticsService';

interface PortfolioAnalyticsProps {
    analytics: PortfolioAnalyticsType | null;
}

export const PortfolioAnalytics: React.FC<PortfolioAnalyticsProps> = ({ analytics }) => {
    if (!analytics) {
        return (
            <div className="bg-white rounded-xl shadow-lg p-6">
                <div className="text-center text-gray-500">
                    <p>No analysis available. Click "Generate Analysis" to analyze your portfolio.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-lg">
            {/* Market Position Analysis */}
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Market Position Analysis</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* VOO Analysis */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">VOO (S&P 500)</h4>
                            <span className="text-sm text-gray-500">200 SMA Signal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${analytics.vooPosition?.isAboveSMA ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                            <span className="text-sm font-medium text-gray-700">
                                {analytics.vooPosition?.isAboveSMA ? 'Above 200 SMA' : 'Below 200 SMA - Potential Buy'}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Distance from 200 SMA: {analytics.vooPosition?.smaDistance}%
                        </p>
                    </div>

                    {/* QQQM Analysis */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-gray-900">QQQM (NASDAQ 100)</h4>
                            <span className="text-sm text-gray-500">200 SMA Signal</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${analytics.qqqmPosition?.isAboveSMA ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                            <span className="text-sm font-medium text-gray-700">
                                {analytics.qqqmPosition?.isAboveSMA ? 'Above 200 SMA' : 'Below 200 SMA - Potential Buy'}
                            </span>
                        </div>
                        <p className="mt-2 text-sm text-gray-600">
                            Distance from 200 SMA: {analytics.qqqmPosition?.smaDistance}%
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Holdings */}
            <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Holdings</h3>
                <div className="space-y-4">
                    {analytics.topPerformers
                        .filter(p => p.symbol === 'VOO' || p.symbol === 'QQQM')
                        .map((holding) => (
                            <div key={holding.symbol} className="bg-gray-50 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="font-medium text-gray-900">{holding.symbol}</span>
                                        <span className={`text-sm font-medium ${holding.gainPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {holding.gainPercentage >= 0 ? '+' : ''}{holding.gainPercentage.toFixed(2)}%
                                        </span>
                                    </div>
                                </div>
                            </div>
                    ))}
                </div>
            </div>

            {/* Buy Strategy Recommendations */}
            <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Buy Strategy Analysis</h3>
                <div className="space-y-4">
                    <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Current Market Conditions</h4>
                        <p className="text-sm text-gray-700">
                            {analytics.summary}
                        </p>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">Buying Opportunities</h4>
                        <ul className="space-y-2">
                            {analytics.recommendations.map((recommendation, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                                    <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span>{recommendation}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}; 