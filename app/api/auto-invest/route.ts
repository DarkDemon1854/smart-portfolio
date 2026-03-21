import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";
import { TickerData, engineerFeatures, featureRowToArray, calculateCovarianceMatrix } from "@/lib/finance";
import { trainRandomForest } from "@/lib/models/rf";
import { trainGradientBoosting } from "@/lib/models/gb";
import { trainCNN } from "@/lib/models/cnn";
import { simulatedAnnealing, SAParams } from "@/lib/optimizer/sa";

const schema = z.object({
    tickersData: z.array(z.any()),
    model: z.enum(["rf", "boosting", "cnn", "ensemble"]),
    fastMode: z.boolean().default(true),
    maxWeight: z.number(),
    riskFreeRate: z.number(),
    lambda: z.number(),
    objective: z.enum(["sharpe", "minVol", "maxReturn"]),
    amountCents: z.number().int().positive(),
});

async function predictForTicker(td: TickerData, model: string, fastMode: boolean): Promise<number> {
    const features = engineerFeatures(td);
    if (features.length === 0) return 0;
    const trainFeatures = features.slice(0, Math.floor(features.length * 0.8));
    const latest = features[features.length - 1];
    const X = [featureRowToArray(latest)];

    if (model === "ensemble") {
        const { model: rfM } = trainRandomForest(trainFeatures);
        const { model: gbM } = trainGradientBoosting(trainFeatures);
        return (rfM.predict(X)[0] + gbM.predict(X)[0]) / 2;
    }

    if (model === "rf") {
        const { model: m } = trainRandomForest(trainFeatures);
        return m.predict(X)[0];
    } else if (model === "boosting") {
        const { model: m } = trainGradientBoosting(trainFeatures);
        return m.predict(X)[0];
    } else {
        const { model: m } = await trainCNN(trainFeatures, fastMode);
        const val = m.predict(X)[0];
        m.dispose();
        return val;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickersData, model, fastMode, maxWeight, riskFreeRate, lambda, objective, amountCents } =
            schema.parse(body);

        const allFeatures = (tickersData as TickerData[]).reduce((sum, td) => sum + engineerFeatures(td).length, 0);
        if (allFeatures < 50) {
            return NextResponse.json({ error: "Insufficient data for training. Need at least 50 samples." }, { status: 400 });
        }

        const expectedReturns: number[] = [];
        for (const td of tickersData as TickerData[]) {
            expectedReturns.push(await predictForTicker(td, model, fastMode));
        }

        const bullishIndexes = expectedReturns
            .map((r, i) => ({ r, i }))
            .filter(x => x.r > 0)
            .map(x => x.i);

        if (bullishIndexes.length === 0) {
            return NextResponse.json({
                error: "No bullish signals — model predicts all tickers will go down. Nothing bought.",
                expectedReturns,
                skipped: (tickersData as TickerData[]).map(td => td.ticker),
            }, { status: 200 });
        }

        const bullishData = bullishIndexes.map(i => (tickersData as TickerData[])[i]);
        const bullishReturns = bullishIndexes.map(i => expectedReturns[i]);
        const covMatrix = calculateCovarianceMatrix(bullishData);

        const saParams: SAParams = {
            maxWeight,
            riskFreeRate,
            lambda,
            objective: objective as "sharpe" | "minVol" | "maxReturn",
        };
        const optimized = simulatedAnnealing(bullishReturns, covMatrix, saParams);
        const weights = optimized.weights;
        const tickers = bullishData.map(td => td.ticker);

        const { user, wallet, portfolio } = await ensureUser();
        if (wallet.cashCents < amountCents) {
            return NextResponse.json({ error: "Insufficient cash balance" }, { status: 400 });
        }

        const prices: number[] = [];
        for (const ticker of tickers) {
            prices.push(await fetchLatestPrice(ticker));
        }

        const trades = [];
        let totalInvestedCents = 0;

        for (let i = 0; i < tickers.length; i++) {
            const allocCents = Math.round(amountCents * weights[i]);
            const priceCents = Math.round(prices[i] * 100);
            const qty = allocCents / priceCents;
            if (qty <= 0) continue;

            totalInvestedCents += allocCents;

            const trade = await prisma.trade.create({
                data: {
                    portfolioId: portfolio.id,
                    userId: user.id,
                    ticker: tickers[i],
                    side: "BUY",
                    priceCents,
                    quantity: qty,
                    valueCents: allocCents,
                    feesCents: 0,
                    realizedPnlCents: 0,
                },
            });
            trades.push(trade);

            const existing = await prisma.position.findFirst({
                where: { portfolioId: portfolio.id, ticker: tickers[i] },
            });

            if (existing) {
                const newQty = existing.quantity + qty;
                const newAvg = Math.round(
                    (existing.quantity * existing.avgCostCents + qty * priceCents) / newQty
                );
                await prisma.position.update({
                    where: { id: existing.id },
                    data: { quantity: newQty, avgCostCents: newAvg },
                });
            } else {
                await prisma.position.create({
                    data: {
                        portfolioId: portfolio.id,
                        ticker: tickers[i],
                        quantity: qty,
                        avgCostCents: priceCents,
                    },
                });
            }
        }

        await prisma.wallet.update({
            where: { id: wallet.id },
            data: { cashCents: { decrement: totalInvestedCents } },
        });

        await prisma.walletLedger.create({
            data: {
                walletId: wallet.id,
                userId: user.id,
                type: "INVEST",
                amountCents: -totalInvestedCents,
                metaJson: JSON.stringify({ tickers, weights, auto: true }),
            },
        });

        const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });

        const allTickers = (tickersData as TickerData[]).map(td => td.ticker);
        const skippedTickers = allTickers
            .filter((_, i) => !bullishIndexes.includes(i))
            .map((ticker) => ({ ticker, predictedReturn: expectedReturns[allTickers.indexOf(ticker)] }));

        return NextResponse.json({
            trades,
            boughtTickers: tickers,
            skippedTickers,
            weights,
            expectedReturns,
            portfolioReturn: optimized.expectedReturn,
            portfolioVolatility: optimized.volatility,
            portfolioSharpe: optimized.sharpe,
            totalInvestedCents,
            cashCents: updatedWallet!.cashCents,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Auto invest failed" }, { status: 500 });
    }
}
