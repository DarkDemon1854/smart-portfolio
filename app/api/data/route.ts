import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { DEMO_DATA, TickerData, alignTickerData } from "@/lib/finance";
import { fetchYahooData } from "@/lib/yahoo";

const requestSchema = z.object({
    tickers: z.array(z.string()),
    startDate: z.string(),
    endDate: z.string(),
    interval: z.string().default("1d"),
    demoMode: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickers, startDate, endDate, interval, demoMode } = requestSchema.parse(body);

        if (demoMode) {
            const demoTickersData: TickerData[] = tickers
                .filter(ticker => DEMO_DATA[ticker])
                .map(ticker => ({
                    ticker,
                    prices: DEMO_DATA[ticker],
                }));

            if (demoTickersData.length === 0) {
                return NextResponse.json(
                    { error: "No demo data available for selected tickers" },
                    { status: 400 }
                );
            }

            const aligned = alignTickerData(demoTickersData);

            return NextResponse.json({
                data: aligned,
                message: "Demo data loaded successfully",
            });
        }

        const tickersData: TickerData[] = [];

        for (const ticker of tickers) {
            try {
                const prices = await fetchYahooData(ticker, startDate, endDate);

                if (prices.length > 0) {
                    tickersData.push({ ticker, prices });
                }
            } catch (error: any) {
                console.error(`Failed to fetch ${ticker}:`, error.message || error);
            }
        }

        if (tickersData.length === 0) {
            return NextResponse.json(
                { error: "Failed to fetch data for any ticker. Try enabling Demo Mode." },
                { status: 400 }
            );
        }

        const aligned = alignTickerData(tickersData);

        return NextResponse.json({
            data: aligned,
            message: `Successfully fetched ${aligned.length} tickers`,
        });
    } catch (error: any) {
        console.error("Data fetch error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch data" },
            { status: 500 }
        );
    }
}
