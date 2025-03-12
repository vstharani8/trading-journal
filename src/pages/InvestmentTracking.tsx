import React, { useState, useEffect } from 'react';
import { useUser } from '@supabase/auth-helpers-react';
import { investmentService } from '../services/investment';
import type { InvestmentWithCurrentValue, PortfolioSummary } from '../types/investment';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import AddInvestmentDialog from '../components/investment/AddInvestmentDialog';
import InvestmentList from '../components/investment/InvestmentList';
import PortfolioSummaryCard from '../components/investment/PortfolioSummaryCard';

export default function InvestmentTracking() {
  const user = useUser();
  const [investments, setInvestments] = useState<InvestmentWithCurrentValue[]>([]);
  const [summary, setSummary] = useState<PortfolioSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load investments with current values
      const rawInvestments = await investmentService.getAllInvestments(user.id);
      const investmentsWithValue = await Promise.all(
        rawInvestments.map(inv => investmentService.getInvestmentWithCurrentValue(inv))
      );
      setInvestments(investmentsWithValue);

      // Load portfolio summary
      const portfolioSummary = await investmentService.getPortfolioSummary(user.id);
      setSummary(portfolioSummary);
    } catch (err) {
      console.error('Error loading investment data:', err);
      setError('Failed to load investment data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAddInvestment = async () => {
    setIsAddDialogOpen(false);
    await loadData();
  };

  const handleDeleteInvestment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this investment?')) return;

    try {
      await investmentService.deleteInvestment(id);
      await loadData();
    } catch (err) {
      console.error('Error deleting investment:', err);
      setError('Failed to delete investment. Please try again later.');
    }
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Please log in to view your investments.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Investment Tracking</h1>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          Add Investment
        </Button>
      </div>

      {error && (
        <Card className="bg-red-50">
          <CardContent className="py-4">
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {summary && <PortfolioSummaryCard summary={summary} />}
          
          <Card>
            <CardHeader>
              <CardTitle>Your Investments</CardTitle>
            </CardHeader>
            <CardContent>
              <InvestmentList 
                investments={investments}
                onDelete={handleDeleteInvestment}
              />
            </CardContent>
          </Card>
        </>
      )}

      <AddInvestmentDialog
        open={isAddDialogOpen}
        onClose={() => setIsAddDialogOpen(false)}
        onAdd={handleAddInvestment}
      />
    </div>
  );
} 