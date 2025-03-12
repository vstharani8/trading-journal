export interface Investment {
    id: string;
    userId: string;
    stockSymbol: string;
    purchaseDate: Date;
    purchasePrice: number;
    numberOfShares: number;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface InvestmentFormData {
    stockSymbol: string;
    purchaseDate: string;
    purchasePrice: number;
    numberOfShares: number;
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