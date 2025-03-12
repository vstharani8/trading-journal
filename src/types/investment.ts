export interface Investment {
    id: string;
    user_id: string;
    stock_symbol: string;
    purchase_date: Date;
    purchase_price: number;
    number_of_shares: number;
    notes?: string;
    created_at: Date;
    updated_at: Date;
}

export interface InvestmentFormData {
    stock_symbol: string;
    purchase_date: string;
    purchase_price: number;
    number_of_shares: number;
    notes?: string;
}

export interface StockPrice {
    symbol: string;
    price: number;
    lastUpdated: Date;
}

export interface PortfolioPerformance {
    totalValue: number;
    totalCost: number;
    totalGainLoss: number;
    totalGainLossPercentage: number;
    portfolioHistory: { date: string; value: number }[];
} 