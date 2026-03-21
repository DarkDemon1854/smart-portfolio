import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
    try {
        const url = new URL(request.url);
        const query = url.searchParams.get("q") || "";

        if (query.length < 1) {
            return NextResponse.json({ results: [] });
        }

        const yahooUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0&listsCount=0&enableFuzzyQuery=false&quotesQueryId=tss_match_phrase_query`;

        const response = await fetch(yahooUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });

        if (!response.ok) {
            throw new Error(`Yahoo search HTTP ${response.status}`);
        }

        const data = await response.json();

        const results = (data.quotes || [])
            .filter((q: any) => q.quoteType === "EQUITY" || q.quoteType === "ETF" || q.quoteType === "MUTUALFUND" || q.quoteType === "INDEX")
            .map((q: any) => ({
                symbol: q.symbol,
                name: q.shortname || q.longname || q.symbol,
                type: q.quoteType,
                exchange: q.exchDisp || q.exchange || "",
            }));

        return NextResponse.json({ results });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Search failed" },
            { status: 500 }
        );
    }
}
