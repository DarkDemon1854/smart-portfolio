import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const { user, wallet, portfolio } = await ensureUser();

        const positions = await prisma.position.findMany({
            where: { portfolioId: portfolio.id },
        });

        let investedValueCents = 0;
        for (const pos of positions) {
            try {
                const price = await fetchLatestPrice(pos.ticker);
                investedValueCents += Math.round(pos.quantity * price * 100);
            } catch {
                investedValueCents += Math.round(pos.quantity * pos.avgCostCents);
            }
        }

        const ledger = await prisma.walletLedger.findMany({
            where: { userId: user.id },
            orderBy: { createdAt: "desc" },
            take: 20,
        });

        return NextResponse.json({
            cashCents: wallet.cashCents,
            investedValueCents,
            totalEquityCents: wallet.cashCents + investedValueCents,
            ledger,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to get wallet summary" },
            { status: 500 }
        );
    }
}
