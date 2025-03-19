import { useEffect, useState } from 'react';
import { Trade } from '../services/supabase';
import { Link } from 'react-router-dom';
import { db } from '../services/supabase';

interface PositionSummary {
    totalPositions: number;
    totalInvested: number;
    totalExposure: number;
    exposurePercentage: number;
    totalPotentialLoss: number;
    lossPercentage: number;
}

export default function OpenPositions() {
    const [openPositions, setOpenPositions] = useState<Trade[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [positionSummary, setPositionSummary] = useState<PositionSummary>({
        totalPositions: 0,
        totalInvested: 0,
        totalExposure: 0,
        exposurePercentage: 0,
        totalPotentialLoss: 0,
        lossPercentage: 0
    });

    useEffect(() => {
        fetchOpenPositions();
    }, []);
    
    useEffect(() => {
        if (openPositions.length > 0) {
            calculatePositionSummary().catch(error => {
                console.error('Error calculating position summary:', error);
                setErrorMessage('Failed to calculate position summary. Please try again later.');
            });
        }
    }, [openPositions]);

    const fetchOpenPositions = async () => {
        try {
            setLoading(true);
            const allTrades = await db.getAllTrades();
            
            // Filter for open positions only
            const positions = allTrades.filter(trade => trade.status === 'open');
            setOpenPositions(positions);
        } catch (err) {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to load open positions');
        } finally {
            setLoading(false);
        }
    };

    const calculatePositionSummary = async () => {
        try {
            let totalInvested = 0;
            let totalExposure = 0;
            let totalPotentialLoss = 0;

            // Get user settings for total capital
            const { data: { session } } = await db.supabase.auth.getSession();
            const userSettings = session?.user ? await db.getUserSettings(session.user.id) : null;
            const totalCapital = userSettings?.total_capital || 500000; // Default value if not set

            openPositions.forEach(position => {
                const entryPrice = position.entry_price || (position as any).entryPrice;
                const stopLoss = position.stop_loss;
                
                if (entryPrice) {
                    const remainingQuantity = position.remaining_quantity ?? position.quantity ?? (position as any).positionSize;
                    const positionCost = entryPrice * remainingQuantity;
                    
                    totalInvested += positionCost;
                    
                    if (position.type === 'long') {
                        totalExposure += positionCost;
                        // Calculate potential loss for long positions
                        if (stopLoss) {
                            totalPotentialLoss += (entryPrice - stopLoss) * remainingQuantity;
                        }
                    } else if (position.type === 'short') {
                        totalExposure -= positionCost;
                        // Calculate potential loss for short positions
                        if (stopLoss) {
                            totalPotentialLoss += (stopLoss - entryPrice) * remainingQuantity;
                        }
                    }
                }
            });

            // Calculate exposure percentage
            const exposurePercentage = (Math.abs(totalExposure) / totalCapital) * 100;
            // Calculate loss percentage based on total capital instead of invested amount
            const lossPercentage = (Math.abs(totalPotentialLoss) / totalCapital) * 100;

            setPositionSummary({
                totalPositions: openPositions.length,
                totalInvested,
                totalExposure: Math.abs(totalExposure),
                exposurePercentage,
                totalPotentialLoss: Math.abs(totalPotentialLoss),
                lossPercentage
            });
        } catch (error) {
            console.error('Error calculating position summary:', error);
            setErrorMessage('Failed to calculate position summary. Please try again later.');
        }
    };

    const calculatePositionValue = (position: Trade): number => {
        // Get entry price from either entry_price or entryPrice
        const entryPrice = position.entry_price || (position as any).entryPrice;
        if (!entryPrice) return 0;
        
        // Get quantity from remaining_quantity, quantity, or positionSize
        const remainingQuantity = position.remaining_quantity ?? position.quantity ?? (position as any).positionSize;
        
        return entryPrice * remainingQuantity;
    };

    return (
        <div className="min-h-screen bg-gray-50/50 py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Open Positions</h1>
                        <p className="mt-1 text-sm text-gray-500">Manage your active trading positions</p>
                    </div>
                    <Link
                        to="/trade/new"
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200 shadow-sm hover:shadow"
                    >
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add New Trade
                    </Link>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-100 border-t-indigo-600"></div>
                    </div>
                ) : errorMessage ? (
                    <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-xl mb-6" role="alert">
                        <div className="flex items-center">
                            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="text-red-700">{errorMessage}</span>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Market Exposure Summary */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
                            <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Total Positions</h3>
                                    </div>
                                    <p className="text-[32px] font-bold text-gray-900 leading-none mb-2">{positionSummary.totalPositions}</p>
                                    <p className="text-base text-gray-500">Active trades</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Total Invested</h3>
                                    </div>
                                    <p className="text-[28px] font-bold text-gray-900 leading-none mb-2">${positionSummary.totalInvested.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="text-base text-gray-500">Capital deployed</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Market Exposure</h3>
                                    </div>
                                    <p className="text-[32px] font-bold text-gray-900 leading-none mb-2">{positionSummary.exposurePercentage.toFixed(2)}%</p>
                                    <p className="text-base text-gray-500">of total capital</p>
                                </div>
                            </div>
                            <div className="bg-white rounded-[20px] p-6 shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center">
                                            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-semibold text-gray-900">Potential Loss</h3>
                                    </div>
                                    <p className="text-[32px] font-bold text-red-600 leading-none mb-2">${positionSummary.totalPotentialLoss.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                    <p className="text-red-600 text-lg mb-1">({positionSummary.lossPercentage.toFixed(2)}%)</p>
                                    <p className="text-base text-gray-500">based on stop losses</p>
                                </div>
                            </div>
                        </div>

                        {/* Positions Table */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100">
                                <h2 className="text-lg font-semibold text-gray-900">Position Details</h2>
                                <p className="text-sm text-gray-500 mt-1">View and manage your open positions</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead>
                                        <tr className="bg-gray-50">
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Symbol</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entry Date</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entry Price</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Quantity</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Invested Value</th>
                                            <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 bg-white">
                                        {openPositions.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-6 py-12 text-center">
                                                    <div className="flex flex-col items-center justify-center text-gray-500">
                                                        <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                                        </svg>
                                                        <p className="text-xl font-medium text-gray-900">No open positions</p>
                                                        <p className="text-sm text-gray-500 mt-1">Get started by adding your first trade</p>
                                                        <Link
                                                            to="/trade/new"
                                                            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                                        >
                                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                            Add Trade
                                                        </Link>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            openPositions.map((position) => {
                                                const investedValue = calculatePositionValue(position);
                                                
                                                return (
                                                    <tr key={position.id} className="hover:bg-gray-50 transition-colors duration-150">
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <div className="flex items-center">
                                                                <div className="text-sm font-medium text-gray-900">{position.symbol}</div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${position.type === 'long' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                                {position.type === 'long' ? 'Long' : 'Short'}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {new Date(position.entry_date || (position as any).entryDate).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                            ${(position.entry_price || (position as any).entryPrice)?.toFixed(2)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {position.remaining_quantity ?? position.quantity ?? (position as any).positionSize}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                            ${investedValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <Link 
                                                                to={`/trade/${position.id}`} 
                                                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-lg text-indigo-600 bg-indigo-50 hover:bg-indigo-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                                                            >
                                                                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </Link>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
