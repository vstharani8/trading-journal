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

    const handleAddInvestment = async (formData: InvestmentFormData) => {
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

    const openModal = (investment?: Investment) => {
        if (investment) {
            setEditingInvestment(investment);
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingInvestment(null);
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
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold">Investment Portfolio</h1>
                <button
                    onClick={() => openModal()}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Add Investment
                </button>
            </div>
            
            <div className="mb-8">
                <PortfolioSummary performance={portfolioPerformance} />
            </div>
            
            <div>
                <h2 className="text-2xl font-bold mb-4">Your Investments</h2>
                <InvestmentList 
                    investments={investments}
                    currentPrices={currentPrices}
                    onEdit={openModal}
                    onDelete={handleDeleteInvestment}
                />
            </div>

            <InvestmentModal
                isOpen={isModalOpen}
                onClose={closeModal}
                onSubmit={editingInvestment ? handleEditInvestment : handleAddInvestment}
                initialData={editingInvestment ? {
                    stock_symbol: editingInvestment.stock_symbol,
                    purchase_date: new Date(editingInvestment.purchase_date).toISOString().split('T')[0],
                    purchase_price: editingInvestment.purchase_price,
                    number_of_shares: editingInvestment.number_of_shares,
                    notes: editingInvestment.notes
                } : undefined}
                mode={editingInvestment ? 'edit' : 'add'}
            />
        </div>
    );
} 