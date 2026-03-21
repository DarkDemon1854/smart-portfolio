import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { portfolio } = await ensureUser();

        const url = new URL(request.url);
        const from = url.searchParams.get("from");
        const to = url.searchParams.get("to");

        const where: any = { portfolioId: portfolio.id };
        if (from || to) {
            where.date = {};
            if (from) where.date.gte = new Date(from);
            if (to) where.date.lte = new Date(to + "T23:59:59Z");
        }

        const valuations = await prisma.valuation.findMany({
            where,
            orderBy: { date: "asc" },
        });

        return NextResponse.json({
            data: valuations.map((v) => ({
                date: v.date.toISOString().split("T")[0],
                cashCents: v.cashCents,
                equityCents: v.equityCents,
                totalCents: v.totalCents,
            })),
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to fetch performance" },
            { status: 500 }
        );
    }
}
