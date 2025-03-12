import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';
import type { InvestmentWithCurrentValue } from '@/types/investment';

interface InvestmentListProps {
  investments: InvestmentWithCurrentValue[];
  onDelete: (id: string) => void;
}

export default function InvestmentList({ investments, onDelete }: InvestmentListProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (investments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No investments found. Add your first investment to get started!</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Symbol</TableHead>
            <TableHead>Purchase Date</TableHead>
            <TableHead className="text-right">Shares</TableHead>
            <TableHead className="text-right">Purchase Price</TableHead>
            <TableHead className="text-right">Current Price</TableHead>
            <TableHead className="text-right">Current Value</TableHead>
            <TableHead className="text-right">Gain/Loss</TableHead>
            <TableHead className="text-right">Return</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {investments.map((investment) => (
            <TableRow key={investment.id}>
              <TableCell className="font-medium">{investment.symbol}</TableCell>
              <TableCell>{formatDate(investment.purchase_date)}</TableCell>
              <TableCell className="text-right">{investment.shares.toFixed(4)}</TableCell>
              <TableCell className="text-right">{formatCurrency(investment.purchase_price)}</TableCell>
              <TableCell className="text-right">{formatCurrency(investment.current_price)}</TableCell>
              <TableCell className="text-right">{formatCurrency(investment.current_value)}</TableCell>
              <TableCell className={`text-right ${investment.gain_loss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(investment.gain_loss)}
              </TableCell>
              <TableCell className={`text-right ${investment.gain_loss_percentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(investment.gain_loss_percentage)}
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(investment.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
} 