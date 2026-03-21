import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { STOCK_LIST } from "@/lib/stocks";
import { fetchYahooData } from "@/lib/yahoo";
import { TickerData, engineerFeatures } from "@/lib/finance";
import { trainRandomForest } from "@/lib/models/rf";
import { trainGradientBoosting } from "@/lib/models/gb";
import { trainCNN } from "@/lib/models/cnn";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const schema = z.object({
    selectedTickers: z.array(z.string()).default([]),
    model: z.enum(["rf", "boosting", "cnn", "ensemble"]).default("rf"),
    topN: z.number().int().min(1).max(20).default(5),
    lookbackDays: z.number().int().positive().default(1095),
    scanCount: z.number().int().min(5).max(80).default(40),
});

async function predict(td: TickerData, model: string): Promise<number> {
    const features = engineerFeatures(td);
    if (features.length < 20) return 0;
    const trainFeatures = features.slice(0, Math.floor(features.length * 0.8));
    const latest = features[features.length - 1];
    const X = [[
        latest.return, latest.ma5, latest.ma10, latest.ma20,
        latest.volatility10, latest.volatility20, latest.momentum5, latest.momentum10,
    ]];

    if (model === "ensemble") {
        const { model: rfM } = trainRandomForest(trainFeatures, true);
        const { model: gbM } = trainGradientBoosting(trainFeatures, true);
        return (rfM.predict(X)[0] + gbM.predict(X)[0]) / 2;
    }

    if (model === "rf") {
        const { model: m } = trainRandomForest(trainFeatures, true);
        return m.predict(X)[0];
    } else if (model === "boosting") {
        const { model: m } = trainGradientBoosting(trainFeatures, true);
        return m.predict(X)[0];
    } else {
        const { model: m } = await trainCNN(trainFeatures, true);
        const val = m.predict(X)[0];
        m.dispose();
        return val;
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { selectedTickers, model, topN, lookbackDays, scanCount } = schema.parse(body);

        const selected = new Set(selectedTickers.map((t: string) => t.toUpperCase()));

        const candidates = STOCK_LIST
            .filter(s => !selected.has(s.symbol.toUpperCase()))
            .slice(0, scanCount);

        const endDate = new Date().toISOString().slice(0, 10);
        const startMs = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
        const startDate = new Date(startMs).toISOString().slice(0, 10);

        const fetched = await Promise.allSettled(
            candidates.map(async (s) => {
                const prices = await fetchYahooData(s.symbol, startDate, endDate);
                return { ticker: s.symbol, name: s.name, prices };
            })
        );

        const tickersData: (TickerData & { name: string })[] = [];
        for (const r of fetched) {
            if (r.status === "fulfilled" && r.value.prices.length >= 30) {
                tickersData.push(r.value);
            }
        }

        if (tickersData.length === 0) {
            return NextResponse.json({ error: "Could not fetch data for any candidate tickers." }, { status: 500 });
        }

        const predictions = await Promise.all(
            tickersData.map(async (td) => {
                const ret = await predict(td, model);
                return { ticker: td.ticker, name: td.name, predictedReturn: ret };
            })
        );

        const recommendations = predictions
            .filter(p => p.predictedReturn > 0)
            .sort((a, b) => b.predictedReturn - a.predictedReturn)
            .slice(0, topN);

        return NextResponse.json({
            recommendations,
            scanned: tickersData.length,
            model,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Recommendation failed" }, { status: 500 });
    }
}
