import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { portfolio, wallet } = await ensureUser();

        const positions = await prisma.position.findMany({
            where: { portfolioId: portfolio.id },
        });

        const enriched = [];
        let totalCostBasisCents = 0;
        let totalMarketValueCents = 0;

        for (const pos of positions) {
            let currentPrice = pos.avgCostCents / 100;
            try {
                currentPrice = await fetchLatestPrice(pos.ticker);
            } catch { }

            const currentPriceCents = Math.round(currentPrice * 100);
            const marketValueCents = Math.round(pos.quantity * currentPriceCents);
            const costBasisCents = Math.round(pos.quantity * pos.avgCostCents);
            const unrealizedPnlCents = marketValueCents - costBasisCents;
            const unrealizedPnlPct = costBasisCents > 0 ? (unrealizedPnlCents / costBasisCents) * 100 : 0;

            totalCostBasisCents += costBasisCents;
            totalMarketValueCents += marketValueCents;

            enriched.push({
                id: pos.id,
                ticker: pos.ticker,
                quantity: pos.quantity,
                avgCostCents: pos.avgCostCents,
                currentPriceCents,
                marketValueCents,
                unrealizedPnlCents,
                unrealizedPnlPct,
            });
        }

        return NextResponse.json({
            positions: enriched,
            summary: {
                totalCostBasisCents,
                currentValueCents: totalMarketValueCents,
                unrealizedPnlCents: totalMarketValueCents - totalCostBasisCents,
                cashCents: wallet.cashCents,
                totalEquityCents: wallet.cashCents + totalMarketValueCents,
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to fetch positions" },
            { status: 500 }
        );
    }
}
