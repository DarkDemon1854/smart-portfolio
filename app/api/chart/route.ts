import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { fetchYahooData } from "@/lib/yahoo";

export const dynamic = "force-dynamic";

const schema = z.object({
    ticker: z.string().min(1),
    from: z.string(),
    to: z.string(),
    interval: z.enum(["1d", "1wk"]).default("1d"),
});

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const ticker = url.searchParams.get("ticker") || "";
        const from = url.searchParams.get("from") || "";
        const to = url.searchParams.get("to") || "";
        const interval = url.searchParams.get("interval") || "1d";

        schema.parse({ ticker, from, to, interval });

        const period1 = Math.floor(new Date(from).getTime() / 1000);
        const period2 = Math.floor(new Date(to).getTime() / 1000);

        const apiUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=${interval}`;

        const response = await fetch(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(`Yahoo Finance HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data.chart?.result?.[0]?.timestamp) {
            throw new Error("No chart data returned");
        }

        const result = data.chart.result[0];
        const timestamps = result.timestamp;
        const quotes = result.indicators.quote[0];

        const prices = timestamps
            .map((ts: number, i: number) => ({
                date: new Date(ts * 1000).toISOString().split("T")[0],
                open: quotes.open[i] || 0,
                high: quotes.high[i] || 0,
                low: quotes.low[i] || 0,
                close: quotes.close[i] || 0,
                volume: quotes.volume[i] || 0,
            }))
            .filter((p: any) => p.close > 0);

        return NextResponse.json({ ticker, prices });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Failed to fetch chart data" },
            { status: 500 }
        );
    }
}
