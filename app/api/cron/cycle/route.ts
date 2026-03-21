import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice, fetchYahooData } from "@/lib/yahoo";
import { TickerData, engineerFeatures, featureRowToArray, calculateCovarianceMatrix, alignTickerData } from "@/lib/finance";
import { trainRandomForest } from "@/lib/models/rf";
import { trainGradientBoosting } from "@/lib/models/gb";
import { trainCNN } from "@/lib/models/cnn";
import { simulatedAnnealing, SAParams } from "@/lib/optimizer/sa";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const db = prisma as any;

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

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const incomingSecret = searchParams.get("secret");

        const secretRow = await db.setting.findUnique({ where: { key: "cron_secret" } });
        if (!secretRow || !incomingSecret || incomingSecret !== secretRow.value) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const configRow = await db.setting.findUnique({ where: { key: "cron_config" } });
        if (!configRow) {
            return NextResponse.json({ error: "No cron config saved. Configure it in the dashboard first." }, { status: 400 });
        }

        const cfg = JSON.parse(configRow.value) as {
            tickers: string[];
            model: string;
            maxWeight: number;
            riskFreeRate: number;
            lambda: number;
            objective: string;
            amountCents: number;
            lookbackDays: number;
            buyThreshold: number;
            stopLossPercent: number;
        };

        const endDate = new Date().toISOString().slice(0, 10);
        const startMs = Date.now() - cfg.lookbackDays * 24 * 60 * 60 * 1000;
        const startDate = new Date(startMs).toISOString().slice(0, 10);

        const rawData: TickerData[] = [];
        for (const ticker of cfg.tickers) {
            try {
                const prices = await fetchYahooData(ticker, startDate, endDate);
                if (prices.length > 0) rawData.push({ ticker, prices });
            } catch { }
        }

        if (rawData.length === 0) {
            return NextResponse.json({ error: "Failed to fetch any ticker data from Yahoo Finance." }, { status: 500 });
        }

        const tickersData = alignTickerData(rawData);
        const predictions = await predictReturns(tickersData, cfg.model, true);

        const cachePayload = JSON.stringify({
            tickers: cfg.tickers,
            predictions,
            expectedReturns: cfg.tickers.map(t => predictions[t] ?? 0),
            model: cfg.model,
            cachedAt: new Date().toISOString(),
        });
        await db.setting.upsert({
            where: { key: "prediction_cache" },
            update: { value: cachePayload },
            create: { key: "prediction_cache", value: cachePayload },
        });

        const { user, wallet, portfolio } = await ensureUser();
        const positions = await prisma.position.findMany({ where: { portfolioId: portfolio.id } });

        const soldTickers: { ticker: string; predictedReturn: number; proceedsCents: number; realizedPnlCents: number; reason?: string }[] = [];
        let totalProceedsCents = 0;
        const stopLossPercent = cfg.stopLossPercent ?? 0;

        for (const pos of positions) {
            let currentPrice: number;
            try { currentPrice = await fetchLatestPrice(pos.ticker); }
            catch { currentPrice = pos.avgCostCents / 100; }

            const priceCents = Math.round(currentPrice * 100);
            const lossPercent = ((pos.avgCostCents - priceCents) / pos.avgCostCents) * 100;
            const stopLossHit = stopLossPercent > 0 && lossPercent >= stopLossPercent;

            const predicted = predictions[pos.ticker] ?? null;
            const isBearish = predicted !== null && predicted < 0;
            const isUnwatched = predicted === null;

            if (!stopLossHit && !isBearish && !isUnwatched) continue;

            const proceedsCents = Math.round(pos.quantity * priceCents);
            const realizedPnlCents = Math.round(pos.quantity * (priceCents - pos.avgCostCents));
            const reason = stopLossHit ? `stop-loss (${lossPercent.toFixed(1)}% loss)` : "bearish prediction";

            await prisma.trade.create({
                data: {
                    portfolioId: portfolio.id, userId: user.id, ticker: pos.ticker,
                    side: "SELL", priceCents, quantity: pos.quantity,
                    valueCents: proceedsCents, feesCents: 0, realizedPnlCents,
                },
            });

            await prisma.position.delete({ where: { id: pos.id } });
            totalProceedsCents += proceedsCents;
            soldTickers.push({ ticker: pos.ticker, predictedReturn: predicted ?? 0, proceedsCents, realizedPnlCents, reason });
        }

        if (totalProceedsCents > 0) {
            await prisma.wallet.update({ where: { id: wallet.id }, data: { cashCents: { increment: totalProceedsCents } } });
            await prisma.walletLedger.create({
                data: {
                    walletId: wallet.id, userId: user.id, type: "SELL",
                    amountCents: totalProceedsCents,
                    metaJson: JSON.stringify({ soldTickers, auto: true, cron: true, stopLossPercent }),
                },
            });
        }

        const refreshedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });
        const availableCents = Math.min(cfg.amountCents, refreshedWallet!.cashCents);

        const buyThreshold = cfg.buyThreshold ?? 0.005;
        const bullishData = tickersData.filter(td => (predictions[td.ticker] ?? 0) >= buyThreshold);
        const bullishReturns = bullishData.map(td => predictions[td.ticker]);

        if (bullishData.length === 0 || availableCents <= 0) {
            const fw = await prisma.wallet.findUnique({ where: { id: wallet.id } });
            await db.setting.upsert({
                where: { key: "cron_last_run" },
                update: { value: new Date().toISOString() },
                create: { key: "cron_last_run", value: new Date().toISOString() },
            });
            return NextResponse.json({
                ok: true, ranAt: new Date().toISOString(),
                soldTickers, boughtTickers: [], totalProceedsCents,
                totalInvestedCents: 0, cashCents: fw!.cashCents,
                message: bullishData.length === 0 ? `No ticker predicted above ${(buyThreshold * 100).toFixed(2)}% buy threshold — holding cash.` : "Insufficient cash.",
            });
        }

        const covMatrix = calculateCovarianceMatrix(bullishData);
        const saParams: SAParams = {
            maxWeight: cfg.maxWeight, riskFreeRate: cfg.riskFreeRate,
            lambda: cfg.lambda, objective: cfg.objective as "sharpe" | "minVol" | "maxReturn",
        };
        const optimized = simulatedAnnealing(bullishReturns, covMatrix, saParams);
        const weights = optimized.weights;

        const boughtTickers: { ticker: string; predictedReturn: number; weight: number; priceCents: number }[] = [];
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
                    portfolioId: portfolio.id, userId: user.id, ticker,
                    side: "BUY", priceCents, quantity: qty,
                    valueCents: allocCents, feesCents: 0, realizedPnlCents: 0,
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

            boughtTickers.push({ ticker, predictedReturn: predictions[ticker], weight: weights[i], priceCents });
        }

        await prisma.wallet.update({ where: { id: wallet.id }, data: { cashCents: { decrement: totalInvestedCents } } });
        await prisma.walletLedger.create({
            data: {
                walletId: wallet.id, userId: user.id, type: "INVEST",
                amountCents: -totalInvestedCents,
                metaJson: JSON.stringify({ boughtTickers, auto: true, cron: true }),
            },
        });

        const fw = await prisma.wallet.findUnique({ where: { id: wallet.id } });
        const now = new Date().toISOString();
        await db.setting.upsert({
            where: { key: "cron_last_run" },
            update: { value: now },
            create: { key: "cron_last_run", value: now },
        });

        return NextResponse.json({
            ok: true, ranAt: now,
            soldTickers, boughtTickers, weights,
            portfolioReturn: optimized.expectedReturn,
            portfolioVolatility: optimized.volatility,
            portfolioSharpe: optimized.sharpe,
            totalProceedsCents, totalInvestedCents,
            cashCents: fw!.cashCents,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Cron cycle failed" }, { status: 500 });
    }
}
