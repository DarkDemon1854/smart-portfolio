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
    sellThreshold: z.number().default(0),
    buyThreshold: z.number().default(0.005),
});

async function predictReturns(
    tickersData: TickerData[],
    model: string,
    fastMode: boolean
): Promise<Record<string, number>> {
    const map: Record<string, number> = {};

    for (const td of tickersData) {
        const features = engineerFeatures(td);
        if (features.length < 20) { map[td.ticker] = 0; continue; }

        const trainFeatures = features.slice(0, Math.floor(features.length * 0.8));
        const latest = features[features.length - 1];
        const X = [featureRowToArray(latest)];

        if (model === "ensemble") {
            const { model: rfM } = trainRandomForest(trainFeatures);
            const { model: gbM } = trainGradientBoosting(trainFeatures);
            map[td.ticker] = (rfM.predict(X)[0] + gbM.predict(X)[0]) / 2;
            continue;
        }

        let trainedModel: any = null;
        if (model === "rf") {
            const { model: m } = trainRandomForest(trainFeatures);
            trainedModel = m;
        } else if (model === "boosting") {
            const { model: m } = trainGradientBoosting(trainFeatures);
            trainedModel = m;
        } else {
            const { model: m } = await trainCNN(trainFeatures, fastMode);
            trainedModel = m;
        }

        map[td.ticker] = trainedModel.predict(X)[0];
        if (model === "cnn" && trainedModel?.dispose) trainedModel.dispose();
    }

    return map;
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickersData, model, fastMode, maxWeight, riskFreeRate, lambda, objective, amountCents, sellThreshold, buyThreshold } =
            schema.parse(body);

        const predictions = await predictReturns(tickersData as TickerData[], model, fastMode);

        const { user, wallet, portfolio } = await ensureUser();
        const positions = await prisma.position.findMany({ where: { portfolioId: portfolio.id } });

        const soldTickers: { ticker: string; predictedReturn: number; proceedsCents: number; realizedPnlCents: number }[] = [];
        let totalProceedsCents = 0;

        for (const pos of positions) {
            const predicted = predictions[pos.ticker] ?? null;
            const isBearish = predicted !== null && predicted < sellThreshold;
            const isUnwatched = predicted === null;

            if (!isBearish && !isUnwatched) continue;

            let currentPrice: number;
            try { currentPrice = await fetchLatestPrice(pos.ticker); }
            catch { currentPrice = pos.avgCostCents / 100; }

            const priceCents = Math.round(currentPrice * 100);
            const proceedsCents = Math.round(pos.quantity * priceCents);
            const realizedPnlCents = Math.round(pos.quantity * (priceCents - pos.avgCostCents));

            await prisma.trade.create({
                data: {
                    portfolioId: portfolio.id,
                    userId: user.id,
                    ticker: pos.ticker,
                    side: "SELL",
                    priceCents,
                    quantity: pos.quantity,
                    valueCents: proceedsCents,
                    feesCents: 0,
                    realizedPnlCents,
                },
            });

            await prisma.position.delete({ where: { id: pos.id } });
            totalProceedsCents += proceedsCents;

            soldTickers.push({ ticker: pos.ticker, predictedReturn: predicted ?? 0, proceedsCents, realizedPnlCents });
        }

        if (totalProceedsCents > 0) {
            await prisma.wallet.update({
                where: { id: wallet.id },
                data: { cashCents: { increment: totalProceedsCents } },
            });
            await prisma.walletLedger.create({
                data: {
                    walletId: wallet.id,
                    userId: user.id,
                    type: "SELL",
                    amountCents: totalProceedsCents,
                    metaJson: JSON.stringify({ soldTickers, auto: true, cycle: true }),
                },
            });
        }

        const refreshedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
        const availableCents = Math.min(amountCents, refreshedWallet!.cashCents);

        const bullishData = (tickersData as TickerData[]).filter(td => (predictions[td.ticker] ?? 0) >= buyThreshold);
        const bullishReturns = bullishData.map(td => predictions[td.ticker]);

        if (bullishData.length === 0 || availableCents <= 0) {
            const finalWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
            return NextResponse.json({
                predictions,
                soldTickers,
                boughtTickers: [],
                totalProceedsCents,
                totalInvestedCents: 0,
                cashCents: finalWallet!.cashCents,
                message: bullishData.length === 0
                    ? `No ticker predicted above the ${(buyThreshold * 100).toFixed(2)}% buy threshold — holding cash.`
                    : "Insufficient cash to invest.",
            });
        }

        const covMatrix = calculateCovarianceMatrix(bullishData);
        const saParams: SAParams = { maxWeight, riskFreeRate, lambda, objective: objective as "sharpe" | "minVol" | "maxReturn" };
        const optimized = simulatedAnnealing(bullishReturns, covMatrix, saParams);
        const weights = optimized.weights;

        const boughtTickers: { ticker: string; predictedReturn: number; weight: number; quantity: number; priceCents: number }[] = [];
        let totalInvestedCents = 0;

        for (let i = 0; i < bullishData.length; i++) {
            const ticker = bullishData[i].ticker;
            const allocCents = Math.round(availableCents * weights[i]);
            const price = await fetchLatestPrice(ticker);
            const priceCents = Math.round(price * 100);
            const qty = allocCents / priceCents;
            if (qty <= 0) continue;

            totalInvestedCents += allocCents;

            await prisma.trade.create({
                data: {
                    portfolioId: portfolio.id,
                    userId: user.id,
                    ticker,
                    side: "BUY",
                    priceCents,
                    quantity: qty,
                    valueCents: allocCents,
                    feesCents: 0,
                    realizedPnlCents: 0,
                },
            });

            const existing = await prisma.position.findFirst({ where: { portfolioId: portfolio.id, ticker } });
            if (existing) {
                const newQty = existing.quantity + qty;
                const newAvg = Math.round((existing.quantity * existing.avgCostCents + qty * priceCents) / newQty);
                await prisma.position.update({ where: { id: existing.id }, data: { quantity: newQty, avgCostCents: newAvg } });
            } else {
                await prisma.position.create({ data: { portfolioId: portfolio.id, ticker, quantity: qty, avgCostCents: priceCents } });
            }

            boughtTickers.push({ ticker, predictedReturn: predictions[ticker], weight: weights[i], quantity: qty, priceCents });
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
                metaJson: JSON.stringify({ boughtTickers, auto: true, cycle: true }),
            },
        });

        const finalWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });

        return NextResponse.json({
            predictions,
            soldTickers,
            boughtTickers,
            weights,
            portfolioReturn: optimized.expectedReturn,
            portfolioVolatility: optimized.volatility,
            portfolioSharpe: optimized.sharpe,
            totalProceedsCents,
            totalInvestedCents,
            cashCents: finalWallet!.cashCents,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Smart cycle failed" }, { status: 500 });
    }
}
