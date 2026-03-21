import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";

const schema = z.object({
    amountCents: z.number().int().positive(),
    tickers: z.array(z.string().min(1)),
    weights: z.array(z.number()),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amountCents, tickers, weights } = schema.parse(body);

        if (tickers.length !== weights.length) {
            return NextResponse.json(
                { error: "Tickers and weights length mismatch" },
                { status: 400 }
            );
        }

        const weightSum = weights.reduce((a, b) => a + b, 0);
        if (Math.abs(weightSum - 1) > 0.01) {
            return NextResponse.json(
                { error: "Weights must sum to 1" },
                { status: 400 }
            );
        }

        for (const w of weights) {
            if (w < 0) {
                return NextResponse.json(
                    { error: "No short selling allowed (negative weight)" },
                    { status: 400 }
                );
            }
        }

        const { user, wallet, portfolio } = await ensureUser();

        if (wallet.cashCents < amountCents) {
            return NextResponse.json(
                { error: "Insufficient cash balance" },
                { status: 400 }
            );
        }

        const prices: number[] = [];
        for (const ticker of tickers) {
            const price = await fetchLatestPrice(ticker);
            prices.push(price);
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
                const oldTotal = existing.quantity * existing.avgCostCents;
                const newTotal = qty * priceCents;
                const newQty = existing.quantity + qty;
                const newAvg = Math.round((oldTotal + newTotal) / newQty);

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
                metaJson: JSON.stringify({ tickers, weights }),
            },
        });

        const updatedWallet = await prisma.wallet.findUnique({
            where: { id: wallet.id },
        });

        const positions = await prisma.position.findMany({
            where: { portfolioId: portfolio.id },
        });

        let equityCents = 0;
        for (const pos of positions) {
            const idx = tickers.indexOf(pos.ticker);
            const price = idx >= 0 ? Math.round(prices[idx] * 100) : pos.avgCostCents;
            equityCents += Math.round(pos.quantity * price);
        }

        await prisma.valuation.create({
            data: {
                portfolioId: portfolio.id,
                date: new Date(),
                cashCents: updatedWallet!.cashCents,
                equityCents,
                totalCents: updatedWallet!.cashCents + equityCents,
            },
        });

        return NextResponse.json({
            wallet: { cashCents: updatedWallet!.cashCents },
            trades,
            positions,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Investment failed" },
            { status: 500 }
        );
    }
}
