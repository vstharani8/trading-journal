import { Investment, StockPrice } from '../../types/investment';

export interface PortfolioAnalytics {
    summary: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    diversificationScore: number;
    topPerformers: Array<{
        symbol: string;
        gainPercentage: number;
    }>;
    recommendations: string[];
}

export class AIAnalyticsService {
    private static calculateStandardDeviation(array: number[]): number {
        const n = array.length;
        const mean = array.reduce((a, b) => a + b) / n;
        return Math.sqrt(array.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b) / n);
    }

    static analyzePortfolio(investments: Investment[], currentPrices: StockPrice[]): PortfolioAnalytics {
        if (investments.length === 0) {
            return {
                summary: "No investments found in the portfolio.",
                riskLevel: "Low",
                diversificationScore: 0,
                topPerformers: [],
                recommendations: ["Consider adding some investments to start building your portfolio."]
            };
        }

        // Calculate portfolio metrics
        const totalInvestments = investments.length;
        const uniqueStocks = new Set(investments.map(inv => inv.stock_symbol)).size;
        const diversificationScore = (uniqueStocks / totalInvestments) * 100;

        // Calculate performance for each investment
        const performanceData = investments.map(investment => {
            const currentPrice = currentPrices.find(p => p.symbol === investment.stock_symbol)?.price || 0;
            const costBasis = investment.purchase_price * investment.number_of_shares;
            const currentValue = currentPrice * investment.number_of_shares;
            const gainLoss = currentValue - costBasis;
            const gainPercentage = (gainLoss / costBasis) * 100;

            return {
                symbol: investment.stock_symbol,
                gainPercentage,
                value: currentValue
            };
        });

        // Sort by performance
        const sortedByPerformance = [...performanceData].sort((a, b) => b.gainPercentage - a.gainPercentage);
        const topPerformers = sortedByPerformance.slice(0, 3).map(p => ({
            symbol: p.symbol,
            gainPercentage: p.gainPercentage
        }));

        // Determine risk level
        const volatility = this.calculateStandardDeviation(performanceData.map(p => p.gainPercentage));
        let riskLevel: 'Low' | 'Medium' | 'High' = 'Low';
        if (volatility > 30) riskLevel = 'High';
        else if (volatility > 15) riskLevel = 'Medium';

        // Generate recommendations
        const recommendations: string[] = [];
        if (diversificationScore < 50) {
            recommendations.push("Consider diversifying your portfolio across more stocks to reduce risk.");
        }
        if (uniqueStocks < 5) {
            recommendations.push("Adding more diverse investments could help optimize your portfolio.");
        }
        if (performanceData.some(p => p.gainPercentage < -15)) {
            recommendations.push("Review underperforming positions for potential rebalancing.");
        }

        // Generate summary
        const totalGainLoss = performanceData.reduce((sum, p) => sum + p.gainPercentage, 0) / performanceData.length;
        const summary = `Your portfolio consists of ${totalInvestments} investments across ${uniqueStocks} different stocks. ` +
            `Overall performance is ${totalGainLoss > 0 ? 'positive' : 'negative'} with an average return of ${totalGainLoss.toFixed(2)}%. ` +
            `The portfolio shows a ${riskLevel.toLowerCase()} risk profile with a diversification score of ${diversificationScore.toFixed(1)}%.`;

        return {
            summary,
            riskLevel,
            diversificationScore,
            topPerformers,
            recommendations
        };
    }
} 