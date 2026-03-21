import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TickerData, calculateReturns } from "@/lib/finance";
import { calculateCAGR, calculateMaxDrawdown, calculateVolatility, calculateSharpe } from "@/lib/metrics";

const requestSchema = z.object({
    tickersData: z.array(z.any()),
    weights: z.array(z.number()),
    startCapital: z.number().default(10000),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickersData, weights, startCapital } = requestSchema.parse(body);

        const tickers = tickersData as TickerData[];

        if (tickers.length === 0 || weights.length !== tickers.length) {
            return NextResponse.json(
                { error: "Invalid tickers or weights" },
                { status: 400 }
            );
        }

        if (!tickers[0] || !tickers[0].prices || tickers[0].prices.length < 30) {
            return NextResponse.json(
                { error: "Insufficient data for backtesting. Need at least 30 data points." },
                { status: 400 }
            );
        }

        const splitIndex = Math.floor(tickers[0].prices.length * 0.8);
        const testPrices = tickers.map(td => td.prices.slice(splitIndex));

        if (testPrices[0].length < 2) {
            return NextResponse.json(
                { error: "Insufficient test data. Need at least 2 data points in test set." },
                { status: 400 }
            );
        }

        const portfolioValues: number[] = [startCapital];
        const dates: string[] = [testPrices[0][0].date];

        for (let i = 1; i < testPrices[0].length; i++) {
            let portfolioReturn = 0;
            for (let j = 0; j < tickers.length; j++) {
                const prevClose = testPrices[j][i - 1]?.close || 0;
                const currClose = testPrices[j][i]?.close || 0;
                if (prevClose === 0) continue;
                const assetReturn = (currClose - prevClose) / prevClose;
                portfolioReturn += weights[j] * assetReturn;
            }
            const newValue = portfolioValues[i - 1] * (1 + portfolioReturn);
            portfolioValues.push(newValue);
            dates.push(testPrices[0][i].date);
        }

        const portfolioReturns = calculateReturns(portfolioValues);
        const cagr = calculateCAGR(portfolioValues);
        const maxDrawdown = calculateMaxDrawdown(portfolioValues);
        const volatility = calculateVolatility(portfolioReturns);
        const sharpe = calculateSharpe(portfolioReturns);

        const equalWeights = Array(tickers.length).fill(1 / tickers.length);
        const equalPortfolioValues: number[] = [startCapital];

        for (let i = 1; i < testPrices[0].length; i++) {
            let portfolioReturn = 0;
            for (let j = 0; j < tickers.length; j++) {
                const prevClose = testPrices[j][i - 1].close;
                const currClose = testPrices[j][i].close;
                const assetReturn = (currClose - prevClose) / prevClose;
                portfolioReturn += equalWeights[j] * assetReturn;
            }
            const newValue = equalPortfolioValues[i - 1] * (1 + portfolioReturn);
            equalPortfolioValues.push(newValue);
        }

        const equalReturns = calculateReturns(equalPortfolioValues);
        const equalCagr = calculateCAGR(equalPortfolioValues);
        const equalMaxDrawdown = calculateMaxDrawdown(equalPortfolioValues);
        const equalVolatility = calculateVolatility(equalReturns);
        const equalSharpe = calculateSharpe(equalReturns);

        const spyIndex = tickers.findIndex(td => td.ticker === "SPY");
        let benchmarkValues: number[] = [];
        let benchmarkCagr = 0;
        let benchmarkMaxDrawdown = 0;
        let benchmarkVolatility = 0;
        let benchmarkSharpe = 0;

        if (spyIndex !== -1) {
            benchmarkValues = testPrices[spyIndex].map((p, i) => {
                if (i === 0) return startCapital;
                const prevClose = testPrices[spyIndex][i - 1].close;
                const currClose = p.close;
                return benchmarkValues[i - 1] * (currClose / prevClose);
            });

            const benchmarkReturns = calculateReturns(benchmarkValues);
            benchmarkCagr = calculateCAGR(benchmarkValues);
            benchmarkMaxDrawdown = calculateMaxDrawdown(benchmarkValues);
            benchmarkVolatility = calculateVolatility(benchmarkReturns);
            benchmarkSharpe = calculateSharpe(benchmarkReturns);
        } else {
            benchmarkValues = testPrices[0].map((p, i) => {
                if (i === 0) return startCapital;
                const prevClose = testPrices[0][i - 1].close;
                const currClose = p.close;
                return benchmarkValues[i - 1] * (currClose / prevClose);
            });

            const benchmarkReturns = calculateReturns(benchmarkValues);
            benchmarkCagr = calculateCAGR(benchmarkValues);
            benchmarkMaxDrawdown = calculateMaxDrawdown(benchmarkValues);
            benchmarkVolatility = calculateVolatility(benchmarkReturns);
            benchmarkSharpe = calculateSharpe(benchmarkReturns);
        }

        return NextResponse.json({
            dates,
            portfolioValues,
            equalPortfolioValues,
            benchmarkValues,
            stats: {
                cagr,
                maxDrawdown,
                volatility,
                sharpe,
            },
            equalStats: {
                cagr: equalCagr,
                maxDrawdown: equalMaxDrawdown,
                volatility: equalVolatility,
                sharpe: equalSharpe,
            },
            benchmarkStats: {
                cagr: benchmarkCagr,
                maxDrawdown: benchmarkMaxDrawdown,
                volatility: benchmarkVolatility,
                sharpe: benchmarkSharpe,
            },
            message: "Backtest completed successfully",
        });
    } catch (error: any) {
        console.error("Backtest error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to run backtest" },
            { status: 500 }
        );
    }
}
