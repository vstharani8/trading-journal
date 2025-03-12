import React, { useState } from 'react';
import { Investment, StockPrice } from '../../types/investment';

interface InvestmentListProps {
    investments: Investment[];
    currentPrices: StockPrice[];
    onEdit: (investment: Investment) => void;
    onDelete: (investment: Investment) => void;
}

interface GroupedInvestment {
    symbol: string;
    totalShares: number;
    totalCost: number;
    investments: Investment[];
    currentPrice: number | null;
    currentValue: number;
    gainLoss: number;
    gainLossPercentage: number;
}

export const InvestmentList: React.FC<InvestmentListProps> = ({ 
    investments, 
    currentPrices, 
    onEdit, 
    onDelete 
}) => {
    const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());

    const getStockPrice = (symbol: string): number | null => {
        const stockPrice = currentPrices.find(price => price.symbol === symbol);
        return stockPrice ? stockPrice.price : null;
    };

    // Group investments by symbol and calculate totals
    const groupedInvestments = investments.reduce((acc: { [key: string]: GroupedInvestment }, investment) => {
        const currentPrice = getStockPrice(investment.stock_symbol);
        const investmentCost = investment.purchase_price * investment.number_of_shares;
        const currentValue = currentPrice ? currentPrice * investment.number_of_shares : 0;

        if (!acc[investment.stock_symbol]) {
            acc[investment.stock_symbol] = {
                symbol: investment.stock_symbol,
                totalShares: 0,
                totalCost: 0,
                investments: [],
                currentPrice,
                currentValue: 0,
                gainLoss: 0,
                gainLossPercentage: 0
            };
        }

        acc[investment.stock_symbol].totalShares += investment.number_of_shares;
        acc[investment.stock_symbol].totalCost += investmentCost;
        acc[investment.stock_symbol].investments.push(investment);
        acc[investment.stock_symbol].currentValue += currentValue;
        acc[investment.stock_symbol].gainLoss = acc[investment.stock_symbol].currentValue - acc[investment.stock_symbol].totalCost;
        acc[investment.stock_symbol].gainLossPercentage = (acc[investment.stock_symbol].gainLoss / acc[investment.stock_symbol].totalCost) * 100;

        return acc;
    }, {});

    const toggleExpand = (symbol: string) => {
        const newExpandedSymbols = new Set(expandedSymbols);
        if (expandedSymbols.has(symbol)) {
            newExpandedSymbols.delete(symbol);
        } else {
            newExpandedSymbols.add(symbol);
        }
        setExpandedSymbols(newExpandedSymbols);
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
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {Object.values(groupedInvestments).map((group) => (
                            <React.Fragment key={group.symbol}>
                                <tr 
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => toggleExpand(group.symbol)}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 flex items-center">
                                        <svg 
                                            className={`w-4 h-4 mr-2 transform transition-transform ${expandedSymbols.has(group.symbol) ? 'rotate-90' : ''}`}
                                            fill="none" 
                                            stroke="currentColor" 
                                            viewBox="0 0 24 24"
                                        >
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                        </svg>
                                        {group.symbol}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {group.totalShares.toFixed(4)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${group.totalCost.toFixed(2)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {group.currentPrice ? `$${group.currentPrice.toFixed(2)}` : 'N/A'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        ${group.currentValue.toFixed(2)}
                                    </td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                                        group.gainLoss >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                        ${group.gainLoss.toFixed(2)} ({group.gainLossPercentage.toFixed(2)}%)
                                    </td>
                                </tr>
                                {expandedSymbols.has(group.symbol) && group.investments.map((investment) => (
                                    <tr key={investment.id} className="bg-gray-50">
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500 pl-12">
                                            {new Date(investment.purchase_date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                            {investment.number_of_shares.toFixed(4)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                            ${(investment.purchase_price * investment.number_of_shares).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                            ${investment.purchase_price.toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                            ${(group.currentPrice ? group.currentPrice * investment.number_of_shares : 0).toFixed(2)}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                            <div className="flex space-x-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEdit(investment);
                                                    }}
                                                    className="text-indigo-600 hover:text-indigo-900"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDelete(investment);
                                                    }}
                                                    className="text-red-600 hover:text-red-900"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}; 