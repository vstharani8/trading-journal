import { Investment, StockPrice } from '../../types/investment';

interface MarketPosition {
    isAboveSMA: boolean;
    smaDistance: number;
}

export interface PortfolioAnalytics {
    summary: string;
    riskLevel: 'Low' | 'Medium' | 'High';
    diversificationScore: number;
    topPerformers: Array<{
        symbol: string;
        gainPercentage: number;
    }>;
    recommendations: string[];
    vooPosition: MarketPosition;
    qqqmPosition: MarketPosition;
}

export class AIAnalyticsService {
    private static calculate200SMA(prices: number[]): number {
        if (prices.length < 200) return 0;
        const last200Prices = prices.slice(-200);
        return last200Prices.reduce((a, b) => a + b) / 200;
    }

    private static calculateMarketPosition(currentPrice: number, historicalPrices: number[]): MarketPosition {
        const sma200 = this.calculate200SMA(historicalPrices);
        const isAboveSMA = currentPrice > sma200;
        const smaDistance = ((currentPrice - sma200) / sma200) * 100;

        return {
            isAboveSMA,
            smaDistance: Number(smaDistance.toFixed(2))
        };
    }

    static analyzePortfolio(investments: Investment[], currentPrices: StockPrice[]): PortfolioAnalytics {
        if (investments.length === 0) {
            return {
                summary: "No investments found in the portfolio.",
                riskLevel: "Low",
                diversificationScore: 0,
                topPerformers: [],
                recommendations: ["Consider adding VOO or QQQM to start building your portfolio."],
                vooPosition: { isAboveSMA: false, smaDistance: 0 },
                qqqmPosition: { isAboveSMA: false, smaDistance: 0 }
            };
        }

        // Calculate basic metrics
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
        const topPerformers = sortedByPerformance.map(p => ({
            symbol: p.symbol,
            gainPercentage: p.gainPercentage
        }));

        // Mock 200 SMA analysis (in real implementation, this would use historical price data)
        const vooPosition = this.calculateMarketPosition(
            currentPrices.find(p => p.symbol === 'VOO')?.price || 0,
            [] // This would be historical prices in real implementation
        );

        const qqqmPosition = this.calculateMarketPosition(
            currentPrices.find(p => p.symbol === 'QQQM')?.price || 0,
            [] // This would be historical prices in real implementation
        );

        // Generate recommendations based on 200 SMA
        const recommendations: string[] = [];
        
        if (!vooPosition.isAboveSMA) {
            recommendations.push(`VOO is currently ${Math.abs(vooPosition.smaDistance).toFixed(1)}% below its 200 SMA - Consider a buying opportunity`);
        }
        
        if (!qqqmPosition.isAboveSMA) {
            recommendations.push(`QQQM is currently ${Math.abs(qqqmPosition.smaDistance).toFixed(1)}% below its 200 SMA - Consider a buying opportunity`);
        }

        if (recommendations.length === 0) {
            recommendations.push("Both ETFs are currently above their 200 SMA. Monitor for potential future buying opportunities.");
        }

        // Generate summary
        const summary = `Analysis based on 200 SMA strategy for VOO and QQQM. ${
            recommendations[0]
        }`;

        return {
            summary,
            riskLevel: "Low", // These are index ETFs, so generally low risk
            diversificationScore,
            topPerformers,
            recommendations,
            vooPosition,
            qqqmPosition
        };
    }
} 