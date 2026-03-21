import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";

export async function POST() {
    try {
        const { user, wallet, portfolio } = await ensureUser();

        const positions = await prisma.position.findMany({
            where: { portfolioId: portfolio.id },
        });

        if (positions.length === 0) {
            return NextResponse.json(
                { error: "No positions to sell" },
                { status: 400 }
            );
        }

        let totalProceedsCents = 0;
        let totalRealizedPnlCents = 0;

        for (const pos of positions) {
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

            totalProceedsCents += proceedsCents;
            totalRealizedPnlCents += realizedPnlCents;
        }

        await prisma.position.deleteMany({
            where: { portfolioId: portfolio.id },
        });

        const updatedWallet = await prisma.wallet.update({
            where: { id: wallet.id },
            data: { cashCents: { increment: totalProceedsCents } },
        });

        await prisma.walletLedger.create({
            data: {
                walletId: wallet.id,
                userId: user.id,
                type: "SELL",
                amountCents: totalProceedsCents,
                metaJson: JSON.stringify({
                    action: "sell_all",
                    realizedPnlCents: totalRealizedPnlCents,
                }),
            },
        });

        await prisma.valuation.create({
            data: {
                portfolioId: portfolio.id,
                date: new Date(),
                cashCents: updatedWallet.cashCents,
                equityCents: 0,
                totalCents: updatedWallet.cashCents,
            },
        });

        return NextResponse.json({
            cashCents: updatedWallet.cashCents,
            totalRealizedPnlCents,
            positionsSold: positions.length,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Sell all failed" },
            { status: 500 }
        );
    }
}
