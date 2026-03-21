import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";
import { fetchLatestPrice } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const { wallet, portfolio } = await ensureUser();
        const url = new URL(request.url);
        const end = url.searchParams.get("end");
        const method = url.searchParams.get("method") || "deterministic";
        const nSims = parseInt(url.searchParams.get("n") || "500", 10);

        if (!end) {
            return NextResponse.json({ error: "end date required" }, { status: 400 });
        }

        const positions = await prisma.position.findMany({
            where: { portfolioId: portfolio.id },
        });

        if (positions.length === 0) {
            return NextResponse.json({ error: "No positions to project" }, { status: 400 });
        }

        let currentValueCents = 0;
        const weights: number[] = [];
        const values: number[] = [];

        for (const pos of positions) {
            let price: number;
            try {
                price = await fetchLatestPrice(pos.ticker);
            } catch {
                price = pos.avgCostCents / 100;
            }
            const val = pos.quantity * price * 100;
            values.push(val);
            currentValueCents += val;
        }

        for (const v of values) {
            weights.push(v / currentValueCents);
        }

        const totalValue = (currentValueCents + wallet.cashCents) / 100;
        const endDate = new Date(end);
        const today = new Date();
        const diffDays = Math.max(1, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

        const dailyMu = 0.0003;
        const dailySigma = 0.012;

        if (method === "deterministic") {
            const projected = totalValue * Math.pow(1 + dailyMu, diffDays);

            return NextResponse.json({
                method: "deterministic",
                currentValue: totalValue,
                projectedValue: projected,
                days: diffDays,
                endDate: end,
            });
        }

        const finalValues: number[] = [];
        for (let sim = 0; sim < nSims; sim++) {
            let val = totalValue;
            for (let d = 0; d < diffDays; d++) {
                const z = gaussianRandom();
                const ret = dailyMu + dailySigma * z;
                val *= 1 + ret;
            }
            finalValues.push(val);
        }
        finalValues.sort((a, b) => a - b);

        const p10 = finalValues[Math.floor(nSims * 0.1)];
        const median = finalValues[Math.floor(nSims * 0.5)];
        const p90 = finalValues[Math.floor(nSims * 0.9)];

        const bands: { day: number; p10: number; median: number; p90: number }[] = [];
        const step = Math.max(1, Math.floor(diffDays / 50));
        for (let d = 0; d <= diffDays; d += step) {
            const dayVals: number[] = [];
            for (let sim = 0; sim < Math.min(nSims, 200); sim++) {
                let val = totalValue;
                for (let dd = 0; dd < d; dd++) {
                    const z = gaussianRandom();
                    val *= 1 + dailyMu + dailySigma * z;
                }
                dayVals.push(val);
            }
            dayVals.sort((a, b) => a - b);
            bands.push({
                day: d,
                p10: dayVals[Math.floor(dayVals.length * 0.1)],
                median: dayVals[Math.floor(dayVals.length * 0.5)],
                p90: dayVals[Math.floor(dayVals.length * 0.9)],
            });
        }

        return NextResponse.json({
            method: "monteCarlo",
            currentValue: totalValue,
            days: diffDays,
            endDate: end,
            simulations: nSims,
            p10,
            median,
            p90,
            bands,
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Projection failed" },
            { status: 500 }
        );
    }
}

function gaussianRandom(): number {
    let u = 0;
    let v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
