import React from 'react';
import { Investment, StockPrice } from '../../../types/investment';

interface InvestmentListProps {
    investments: Investment[];
    currentPrices: StockPrice[];
}

export const InvestmentList: React.FC<InvestmentListProps> = ({ investments, currentPrices }) => {
    const getStockPrice = (symbol: string): number | null => {
        const stockPrice = currentPrices.find(price => price.symbol === symbol);
        return stockPrice ? stockPrice.price : null;
    };

    const calculatePerformance = (investment: Investment) => {
        const currentPrice = getStockPrice(investment.stockSymbol);
        if (!currentPrice) return null;

        const currentValue = currentPrice * investment.numberOfShares;
        const costBasis = investment.purchasePrice * investment.numberOfShares;
        const gainLoss = currentValue - costBasis;
        const gainLossPercentage = (gainLoss / costBasis) * 100;

        return {
            currentValue,
            gainLoss,
            gainLossPercentage
        };
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Symbol
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Purchase Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Purchase Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Shares
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Value
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Gain/Loss
                        </th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {investments.map((investment) => {
                        const performance = calculatePerformance(investment);
                        const currentPrice = getStockPrice(investment.stockSymbol);

                        return (
                            <tr key={investment.id}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {investment.stockSymbol}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {new Date(investment.purchaseDate).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    ${investment.purchasePrice.toFixed(2)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {investment.numberOfShares}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {currentPrice ? `$${currentPrice.toFixed(2)}` : 'N/A'}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {performance ? `$${performance.currentValue.toFixed(2)}` : 'N/A'}
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                    performance?.gainLoss && performance.gainLoss >= 0 
                                        ? 'text-green-600' 
                                        : 'text-red-600'
                                }`}>
                                    {performance
                                        ? `${performance.gainLoss >= 0 ? '+' : ''}$${performance.gainLoss.toFixed(2)} (${
                                            performance.gainLossPercentage >= 0 ? '+' : ''}${
                                            performance.gainLossPercentage.toFixed(2)}%)`
                                        : 'N/A'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}; 