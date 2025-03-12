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

    const getRiskLevelColor = (riskLevel: 'Low' | 'Medium' | 'High') => {
        switch (riskLevel) {
            case 'Low': return 'text-green-600';
            case 'Medium': return 'text-yellow-600';
            case 'High': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">AI Portfolio Analysis</h2>
            
            {/* Summary */}
            <div className="mb-6">
                <p className="text-gray-700">{analytics.summary}</p>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Risk Level</h3>
                    <p className={`text-lg font-semibold ${getRiskLevelColor(analytics.riskLevel)}`}>
                        {analytics.riskLevel}
                    </p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Diversification Score</h3>
                    <p className="text-lg font-semibold text-gray-900">
                        {analytics.diversificationScore.toFixed(1)}%
                    </p>
                </div>
            </div>

            {/* Top Performers */}
            {analytics.topPerformers.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-500 mb-3">Top Performers</h3>
                    <div className="space-y-2">
                        {analytics.topPerformers.map((performer) => (
                            <div key={performer.symbol} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                                <span className="font-medium">{performer.symbol}</span>
                                <span className={performer.gainPercentage >= 0 ? 'text-green-600' : 'text-red-600'}>
                                    {performer.gainPercentage >= 0 ? '+' : ''}{performer.gainPercentage.toFixed(2)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Recommendations */}
            {analytics.recommendations.length > 0 && (
                <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-3">AI Recommendations</h3>
                    <ul className="space-y-2">
                        {analytics.recommendations.map((recommendation, index) => (
                            <li key={index} className="flex items-start">
                                <span className="text-indigo-500 mr-2">•</span>
                                <span className="text-gray-700">{recommendation}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}; 