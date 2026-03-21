import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { user } = await ensureUser();
        const url = new URL(request.url);
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");
        const ticker = url.searchParams.get("ticker");

        const where: any = { userId: user.id };
        if (from || to) {
            where.createdAt = {};
            if (from) where.createdAt.gte = new Date(from);
            if (to) where.createdAt.lte = new Date(to + "T23:59:59Z");
        }
        if (ticker) {
            where.ticker = ticker;
        }

        const trades = await prisma.trade.findMany({
            where,
            orderBy: { createdAt: "desc" },
            take: 100,
        });

        return NextResponse.json({ trades });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to fetch trades" },
            { status: 500 }
        );
    }
}
