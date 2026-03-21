import { PriceData } from "@/lib/finance";

export async function fetchYahooData(ticker: string, startDate: string, endDate: string): Promise<PriceData[]> {
    const period1 = Math.floor(new Date(startDate).getTime() / 1000);
    const period2 = Math.floor(new Date(endDate).getTime() / 1000);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?period1=${period1}&period2=${period2}&interval=1d`;

    const response = await fetch(url, {
        headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
    });

    if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.chart?.result?.[0]?.timestamp) {
        throw new Error("No data returned");
    }

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const prices: PriceData[] = timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split("T")[0],
        open: quotes.open[i] || quotes.close[i] || 0,
        high: quotes.high[i] || quotes.close[i] || 0,
        low: quotes.low[i] || quotes.close[i] || 0,
        close: quotes.close[i] || 0,
        volume: quotes.volume[i] || 0,
    })).filter((p: PriceData) => p.close > 0);

    return prices;
}

export async function fetchLatestPrice(ticker: string): Promise<number> {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
    const prices = await fetchYahooData(
        ticker,
        weekAgo.toISOString().split("T")[0],
        now.toISOString().split("T")[0]
    );
    if (prices.length === 0) {
        throw new Error(`No price data for ${ticker}`);
    }
    return prices[prices.length - 1].close;
}
