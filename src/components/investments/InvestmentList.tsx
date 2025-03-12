import React from 'react';
import { Investment, StockPrice } from '../../types/investment';

interface InvestmentListProps {
    investments: Investment[];
    currentPrices: StockPrice[];
    onEdit: (investment: Investment) => void;
    onDelete: (investment: Investment) => void;
}

export const InvestmentList: React.FC<InvestmentListProps> = ({ 
    investments, 
    currentPrices, 
    onEdit, 
    onDelete 
}) => {
    const getStockPrice = (symbol: string): number | null => {
        const stockPrice = currentPrices.find(price => price.symbol === symbol);
        return stockPrice ? stockPrice.price : null;
    };

    const calculatePerformance = (investment: Investment) => {
        const currentPrice = getStockPrice(investment.stock_symbol);
        if (!currentPrice) return null;

        const currentValue = currentPrice * investment.number_of_shares;
        const costBasis = investment.purchase_price * investment.number_of_shares;
        const gainLoss = currentValue - costBasis;
        const gainLossPercentage = (gainLoss / costBasis) * 100;

        return {
            currentValue,
            gainLoss,
            gainLossPercentage
        };
    };

    return (
        <div className="overflow-x-auto -mx-6">
            <div className="inline-block min-w-full align-middle">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Symbol
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Purchase Date
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Purchase Price
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Shares
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Cost
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Price
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Value
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Gain/Loss
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {investments.map((investment) => {
                            const performance = calculatePerformance(investment);
                            const currentPrice = getStockPrice(investment.stock_symbol);

                            return (
                                <tr key={investment.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {investment.stock_symbol}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(investment.purchase_date).toLocaleDateString()}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${investment.purchase_price.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {investment.number_of_shares}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${(investment.purchase_price * investment.number_of_shares).toFixed(2)}
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
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <button
                                            onClick={() => onEdit(investment)}
                                            className="text-indigo-600 hover:text-indigo-900 mr-4"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => onDelete(investment)}
                                            className="text-red-600 hover:text-red-900"
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}; 