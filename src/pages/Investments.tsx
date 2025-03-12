import { useEffect, useState } from 'react';
import { Investment, InvestmentFormData, StockPrice, PortfolioPerformance } from '../types/investment';
import { InvestmentList } from '../components/investments/InvestmentList';
import { PortfolioSummary } from '../components/investments/PortfolioSummary';
import { InvestmentModal } from '../components/investments/InvestmentModal';
import { StockService } from '../lib/services/stockService';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

export default function Investments() {
    const { user } = useAuth();
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [currentPrices, setCurrentPrices] = useState<StockPrice[]>([]);
    const [editingInvestment, setEditingInvestment] = useState<Investment | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [portfolioPerformance, setPortfolioPerformance] = useState<PortfolioPerformance>({
        totalValue: 0,
        totalCost: 0,
        totalGainLoss: 0,
        totalGainLossPercentage: 0,
        portfolioHistory: []
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
            const symbols = [...new Set(investments.map(inv => inv.stock_symbol))];
            const prices = await StockService.getStockPrices(symbols);
            setCurrentPrices(prices);
            
            // Calculate portfolio performance
            let totalValue = 0;
            let totalCost = 0;

            investments.forEach(investment => {
                const currentPrice = prices.find(p => p.symbol === investment.stock_symbol)?.price;
                if (currentPrice) {
                    totalValue += currentPrice * investment.number_of_shares;
                    totalCost += investment.purchase_price * investment.number_of_shares;
                }
            });

            const totalGainLoss = totalValue - totalCost;
            const totalGainLossPercentage = totalCost > 0 ? (totalGainLoss / totalCost) * 100 : 0;

            // Get portfolio history
            const portfolioHistory = await StockService.getPortfolioHistory(
                investments.map(inv => ({
                    stock_symbol: inv.stock_symbol,
                    purchase_date: new Date(inv.purchase_date).toISOString().split('T')[0],
                    number_of_shares: inv.number_of_shares
                }))
            );

            setPortfolioPerformance({
                totalValue,
                totalCost,
                totalGainLoss,
                totalGainLossPercentage,
                portfolioHistory
            });
        } catch (error) {
            console.error('Error updating stock prices:', error);
        }
    };

    const handleSaveInvestment = async (formData: InvestmentFormData) => {
        try {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const { data, error } = await supabase
                .from('investments')
                .insert([{
                    user_id: user.id,
                    stock_symbol: formData.stock_symbol,
                    purchase_date: formData.purchase_date,
                    purchase_price: formData.purchase_price,
                    number_of_shares: formData.number_of_shares,
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

    const handleEditInvestment = async (formData: InvestmentFormData) => {
        try {
            if (!editingInvestment) return;

            const { data, error } = await supabase
                .from('investments')
                .update({
                    stock_symbol: formData.stock_symbol,
                    purchase_date: formData.purchase_date,
                    purchase_price: formData.purchase_price,
                    number_of_shares: formData.number_of_shares,
                    notes: formData.notes
                })
                .eq('id', editingInvestment.id)
                .select();

            if (error) throw error;

            if (data) {
                setInvestments(investments.map(inv => 
                    inv.id === editingInvestment.id ? data[0] : inv
                ));
                setEditingInvestment(null);
                await updateStockPrices();
            }
        } catch (error) {
            console.error('Error updating investment:', error);
        }
    };

    const handleDeleteInvestment = async (investment: Investment) => {
        try {
            const { error } = await supabase
                .from('investments')
                .delete()
                .eq('id', investment.id);

            if (error) throw error;

            setInvestments(investments.filter(inv => inv.id !== investment.id));
            await updateStockPrices();
        } catch (error) {
            console.error('Error deleting investment:', error);
        }
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Investment Portfolio</h1>
                <button
                    onClick={() => {
                        setEditingInvestment(null);
                        setIsModalOpen(true);
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-lg"
                >
                    Add Investment
                </button>
            </div>

            {loading ? (
                <div>Loading...</div>
            ) : (
                <>
                    <div className="mb-8">
                        <PortfolioSummary performance={portfolioPerformance} />
                    </div>

                    <InvestmentList
                        investments={investments}
                        currentPrices={currentPrices}
                        onEdit={(investment) => {
                            setEditingInvestment(investment);
                            setIsModalOpen(true);
                        }}
                        onDelete={handleDeleteInvestment}
                    />
                </>
            )}

            <InvestmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSubmit={editingInvestment ? handleEditInvestment : handleSaveInvestment}
                mode={editingInvestment ? 'edit' : 'add'}
                initialData={editingInvestment ? {
                    stock_symbol: editingInvestment.stock_symbol,
                    purchase_date: new Date(editingInvestment.purchase_date).toISOString().split('T')[0],
                    purchase_price: editingInvestment.purchase_price,
                    number_of_shares: editingInvestment.number_of_shares,
                    notes: editingInvestment.notes
                } : undefined}
            />
        </div>
    );
} 