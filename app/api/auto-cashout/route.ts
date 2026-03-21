import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";
import { TickerData, engineerFeatures, featureRowToArray } from "@/lib/finance";
import { trainRandomForest } from "@/lib/models/rf";
import { trainGradientBoosting } from "@/lib/models/gb";
import { trainCNN } from "@/lib/models/cnn";

const schema = z.object({
    tickersData: z.array(z.any()),
    model: z.enum(["rf", "boosting", "cnn", "ensemble"]),
    fastMode: z.boolean().default(true),
    sellThreshold: z.number().default(0),
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
        const { tickersData, model, fastMode, sellThreshold } = schema.parse(body);

        const tickerReturnMap: Record<string, number> = {};
        for (const td of tickersData as TickerData[]) {
            tickerReturnMap[td.ticker] = await predictForTicker(td, model, fastMode);
        }

        const { user, wallet, portfolio } = await ensureUser();
        const positions = await prisma.position.findMany({ where: { portfolioId: portfolio.id } });

        const toSell = positions.filter(p => (tickerReturnMap[p.ticker] ?? Infinity) < sellThreshold);

        if (toSell.length === 0) {
            return NextResponse.json({
                message: "No positions qualify for auto-sell based on predictions",
                soldTickers: [],
                totalProceedsCents: 0,
                tickerReturnMap,
            });
        }

        let totalProceedsCents = 0;
        let totalRealizedPnlCents = 0;
        const soldTickers: {
            ticker: string;
            predictedReturn: number;
            proceedsCents: number;
            realizedPnlCents: number;
        }[] = [];

        for (const pos of toSell) {
            let currentPrice: number;
            try {
                currentPrice = await fetchLatestPrice(pos.ticker);
            } catch {
                currentPrice = pos.avgCostCents / 100;
            }
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
            totalRealizedPnlCents += realizedPnlCents;
            soldTickers.push({
                ticker: pos.ticker,
                predictedReturn: tickerReturnMap[pos.ticker] ?? 0,
                proceedsCents,
                realizedPnlCents,
            });
        }

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
                metaJson: JSON.stringify({ soldTickers, auto: true }),
            },
        });

        const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });

        return NextResponse.json({
            soldTickers,
            totalProceedsCents,
            totalRealizedPnlCents,
            cashCents: updatedWallet!.cashCents,
            tickerReturnMap,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Auto cashout failed" }, { status: 500 });
    }
}
