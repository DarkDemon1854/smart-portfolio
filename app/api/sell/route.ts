import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";

const schema = z.object({
    ticker: z.string().min(1),
    quantity: z.number().positive(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { ticker, quantity } = schema.parse(body);
        const { user, wallet, portfolio } = await ensureUser();

        const position = await prisma.position.findFirst({
            where: { portfolioId: portfolio.id, ticker },
        });

        if (!position || position.quantity < quantity * 0.9999) {
            return NextResponse.json(
                { error: "Insufficient position quantity" },
                { status: 400 }
            );
        }

        const currentPrice = await fetchLatestPrice(ticker);
        const priceCents = Math.round(currentPrice * 100);
        const proceedsCents = Math.round(quantity * priceCents);
        const feesCents = 0;
        const realizedPnlCents = Math.round(quantity * (priceCents - position.avgCostCents));

        await prisma.trade.create({
            data: {
                portfolioId: portfolio.id,
                userId: user.id,
                ticker,
                side: "SELL",
                priceCents,
                quantity,
                valueCents: proceedsCents,
                feesCents,
                realizedPnlCents,
            },
        });

        const newQty = position.quantity - quantity;
        if (newQty < 0.0001) {
            await prisma.position.delete({ where: { id: position.id } });
        } else {
            await prisma.position.update({
                where: { id: position.id },
                data: { quantity: newQty },
            });
        }

        const updatedWallet = await prisma.wallet.update({
            where: { id: wallet.id },
            data: { cashCents: { increment: proceedsCents - feesCents } },
        });

        await prisma.walletLedger.create({
            data: {
                walletId: wallet.id,
                userId: user.id,
                type: "SELL",
                amountCents: proceedsCents - feesCents,
                metaJson: JSON.stringify({ ticker, quantity, priceCents, realizedPnlCents }),
            },
        });

        const positions = await prisma.position.findMany({
            where: { portfolioId: portfolio.id },
        });
        let equityCents = 0;
        for (const pos of positions) {
            try {
                const p = await fetchLatestPrice(pos.ticker);
                equityCents += Math.round(pos.quantity * p * 100);
            } catch {
                equityCents += Math.round(pos.quantity * pos.avgCostCents);
            }
        }

        await prisma.valuation.create({
            data: {
                portfolioId: portfolio.id,
                date: new Date(),
                cashCents: updatedWallet.cashCents,
                equityCents,
                totalCents: updatedWallet.cashCents + equityCents,
            },
        });

        return NextResponse.json({
            cashCents: updatedWallet.cashCents,
            realizedPnlCents,
            ticker,
            quantitySold: quantity,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Sell failed" },
            { status: 500 }
        );
    }
}
