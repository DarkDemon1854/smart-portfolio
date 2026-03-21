import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";

const schema = z.object({
    stopLossPercent: z.number().min(1).max(100).default(10),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { stopLossPercent } = schema.parse(body);

        const { user, wallet, portfolio } = await ensureUser();
        const positions = await prisma.position.findMany({ where: { portfolioId: portfolio.id } });

        if (positions.length === 0) {
            return NextResponse.json({ message: "No open positions", soldTickers: [], totalProceedsCents: 0 });
        }

        const soldTickers: { ticker: string; lossPercent: number; proceedsCents: number; realizedPnlCents: number }[] = [];
        let totalProceedsCents = 0;
        let totalRealizedPnlCents = 0;

        for (const pos of positions) {
            let currentPrice: number;
            try {
                currentPrice = await fetchLatestPrice(pos.ticker);
            } catch {
                continue;
            }

            const priceCents = Math.round(currentPrice * 100);
            const lossPercent = ((pos.avgCostCents - priceCents) / pos.avgCostCents) * 100;

            if (lossPercent < stopLossPercent) continue;

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
            soldTickers.push({ ticker: pos.ticker, lossPercent: Math.round(lossPercent * 100) / 100, proceedsCents, realizedPnlCents });
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
                    metaJson: JSON.stringify({ soldTickers, stopLoss: true, stopLossPercent }),
                },
            });
        }

        const updatedWallet = await prisma.wallet.findUnique({ where: { id: wallet.id } });

        return NextResponse.json({
            soldTickers,
            totalProceedsCents,
            totalRealizedPnlCents,
            cashCents: updatedWallet!.cashCents,
            message: soldTickers.length > 0
                ? `Stop-loss triggered: sold ${soldTickers.length} position(s) exceeding ${stopLossPercent}% loss`
                : `No positions exceeded the ${stopLossPercent}% stop-loss threshold`,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Stop-loss check failed" }, { status: 500 });
    }
}
