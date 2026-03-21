import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { TickerData, engineerFeatures, featureRowToArray } from "@/lib/finance";
import { trainRandomForest } from "@/lib/models/rf";
import { trainGradientBoosting } from "@/lib/models/gb";
import { trainCNN } from "@/lib/models/cnn";
import { calculateMAE, calculateRMSE } from "@/lib/metrics";

const db = prisma as any;

const requestSchema = z.object({
    tickersData: z.array(z.any()),
    model: z.enum(["rf", "boosting", "cnn", "ensemble"]),
    fastMode: z.boolean().default(true),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickersData, model, fastMode } = requestSchema.parse(body);

        const totalFeatures = (tickersData as TickerData[]).reduce((sum, td) => sum + engineerFeatures(td).length, 0);
        if (totalFeatures < 50) {
            return NextResponse.json(
                { error: "Insufficient data for training. Need at least 50 samples." },
                { status: 400 }
            );
        }

        const expectedReturns: number[] = [];
        const allTestPreds: number[] = [];
        const allTestActual: number[] = [];
        let totalTrainSize = 0;
        let totalTestSize = 0;

        for (const tickerData of tickersData as TickerData[]) {
            const features = engineerFeatures(tickerData);
            if (features.length < 20) {
                expectedReturns.push(0);
                continue;
            }

            const splitIndex = Math.floor(features.length * 0.8);
            const trainFeatures = features.slice(0, splitIndex);
            const testFeatures = features.slice(splitIndex);

            totalTrainSize += trainFeatures.length;
            totalTestSize += testFeatures.length;

            const XTest = testFeatures.map(f => featureRowToArray(f));
            const latest = features[features.length - 1];
            const XLatest = [featureRowToArray(latest)];

            if (model === "ensemble") {
                const { model: rfModel } = trainRandomForest(trainFeatures);
                const { model: gbModel } = trainGradientBoosting(trainFeatures);

                const rfTestPreds = rfModel.predict(XTest);
                const gbTestPreds = gbModel.predict(XTest);
                const ensembleTestPreds = rfTestPreds.map((v, i) => (v + gbTestPreds[i]) / 2);
                allTestPreds.push(...ensembleTestPreds);
                allTestActual.push(...testFeatures.map(f => f.target));

                const rfLatest = rfModel.predict(XLatest)[0];
                const gbLatest = gbModel.predict(XLatest)[0];
                expectedReturns.push((rfLatest + gbLatest) / 2);
            } else {
                let trainedModel: any = null;
                if (model === "rf") {
                    const { model: m } = trainRandomForest(trainFeatures);
                    trainedModel = m;
                } else if (model === "boosting") {
                    const { model: m } = trainGradientBoosting(trainFeatures);
                    trainedModel = m;
                } else {
                    const { model: m } = await trainCNN(trainFeatures, fastMode);
                    trainedModel = m;
                }

                const testPreds = trainedModel.predict(XTest);
                allTestPreds.push(...testPreds);
                allTestActual.push(...testFeatures.map(f => f.target));

                expectedReturns.push(trainedModel.predict(XLatest)[0]);

                if (model === "cnn" && trainedModel?.dispose) trainedModel.dispose();
            }
        }

        const mae = calculateMAE(allTestActual, allTestPreds);
        const rmse = calculateRMSE(allTestActual, allTestPreds);

        const tickers = (tickersData as TickerData[]).map(td => td.ticker);
        const predictionMap: Record<string, number> = {};
        tickers.forEach((t, i) => { predictionMap[t] = expectedReturns[i]; });
        await db.setting.upsert({
            where: { key: "prediction_cache" },
            update: { value: JSON.stringify({ tickers, predictions: predictionMap, expectedReturns, model, cachedAt: new Date().toISOString() }) },
            create: { key: "prediction_cache", value: JSON.stringify({ tickers, predictions: predictionMap, expectedReturns, model, cachedAt: new Date().toISOString() }) },
        });

        return NextResponse.json({
            expectedReturns,
            mae,
            rmse,
            trainSize: totalTrainSize,
            testSize: totalTestSize,
            message: `Model trained successfully using ${model}`,
        });
    } catch (error: any) {
        console.error("Training error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to train model" },
            { status: 500 }
        );
    }
}
