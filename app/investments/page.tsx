import React, { useEffect, useState } from 'react';
import { Investment, InvestmentFormData, StockPrice, PortfolioPerformance } from '../../types/investment';
import { InvestmentForm } from './components/InvestmentForm';
import { InvestmentList } from './components/InvestmentList';
import { PortfolioSummary } from './components/PortfolioSummary';
import { StockService } from '../../lib/services/stockService';
import { supabase } from '../../lib/supabaseClient';

export default function InvestmentsPage() {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [currentPrices, setCurrentPrices] = useState<StockPrice[]>([]);
    const [portfolioPerformance, setPortfolioPerformance] = useState<PortfolioPerformance>({
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0,
        spyPerformance: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchInvestments();
    }, []);

    useEffect(() => {
        if (investments.length > 0) {
            updateStockPrices();
        }
    }, [investments]);

    const fetchInvestments = async () => {
        try {
            const { data: investmentsData, error } = await supabase
                .from('investments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setInvestments(investmentsData || []);
        } catch (error) {
            console.error('Error fetching investments:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStockPrices = async () => {
        try {
            const symbols = [...new Set(investments.map(inv => inv.stockSymbol))];
            const prices = await StockService.getStockPrices(symbols);
            setCurrentPrices(prices);

            // Fetch S&P 500 performance
            const spyPrice = await StockService.getSPYPrice();
            
            // Calculate portfolio performance
            let totalValue = 0;
            let totalCost = 0;

            investments.forEach(investment => {
                const currentPrice = prices.find(p => p.symbol === investment.stockSymbol)?.price;
                if (currentPrice) {
                    totalValue += currentPrice * investment.numberOfShares;
                    totalCost += investment.purchasePrice * investment.numberOfShares;
                }
            });

            const totalGainLoss = totalValue - totalCost;
            const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

            setPortfolioPerformance({
                totalValue,
                totalCost,
                totalGainLoss,
                totalGainLossPercentage,
                spyPerformance: spyPrice || 0
            });
        } catch (error) {
            console.error('Error updating stock prices:', error);
        }
    };

    const handleAddInvestment = async (formData: InvestmentFormData) => {
        try {
            const { data, error } = await supabase
                .from('investments')
                .insert([{
                    stockSymbol: formData.stockSymbol,
                    purchaseDate: formData.purchaseDate,
                    purchasePrice: formData.purchasePrice,
                    numberOfShares: formData.numberOfShares,
                    notes: formData.notes
                }])
                .select();

            if (error) throw error;

            if (data) {
                setInvestments([...investments, data[0]]);
                await updateStockPrices();
            }
        } catch (error) {
            console.error('Error adding investment:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-8">Investment Portfolio</h1>
            
            <div className="mb-8">
                <PortfolioSummary performance={portfolioPerformance} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h2 className="text-2xl font-bold mb-4">Your Investments</h2>
                    <InvestmentList 
                        investments={investments}
                        currentPrices={currentPrices}
                    />
                </div>
                
                <div>
                    <h2 className="text-2xl font-bold mb-4">Add New Investment</h2>
                    <InvestmentForm onSubmit={handleAddInvestment} />
                </div>
            </div>
        </div>
    );
} 