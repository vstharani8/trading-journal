import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { PortfolioSummary } from '@/types/investment';

interface PortfolioSummaryCardProps {
  summary: PortfolioSummary;
}

export default function PortfolioSummaryCard({ summary }: PortfolioSummaryCardProps) {
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

  const getPerformanceColor = (value: number) => {
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Portfolio Value</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(summary.total_value)}</div>
          <p className="text-xs text-muted-foreground">
            Cost Basis: {formatCurrency(summary.total_cost)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Gain/Loss</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(summary.total_gain_loss)}`}>
            {formatCurrency(summary.total_gain_loss)}
          </div>
          <p className={`text-xs ${getPerformanceColor(summary.total_gain_loss_percentage)}`}>
            {formatPercentage(summary.total_gain_loss_percentage)} Return
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">S&P 500 Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(summary.total_gain_loss_percentage - summary.sp500_comparison_percentage)}`}>
            {summary.total_gain_loss_percentage >= summary.sp500_comparison_percentage ? 'Outperforming' : 'Underperforming'}
          </div>
          <p className="text-xs text-muted-foreground">
            S&P 500: {formatPercentage(summary.sp500_comparison_percentage)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Performance Difference</CardTitle>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getPerformanceColor(summary.total_gain_loss_percentage - summary.sp500_comparison_percentage)}`}>
            {formatPercentage(summary.total_gain_loss_percentage - summary.sp500_comparison_percentage)}
          </div>
          <p className="text-xs text-muted-foreground">
            vs S&P 500
          </p>
        </CardContent>
      </Card>
    </div>
  );
} 