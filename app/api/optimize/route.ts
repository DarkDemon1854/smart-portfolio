import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { TickerData, calculateCovarianceMatrix } from "@/lib/finance";
import { simulatedAnnealing, SAParams } from "@/lib/optimizer/sa";

const requestSchema = z.object({
    tickersData: z.array(z.any()),
    expectedReturns: z.array(z.number()),
    maxWeight: z.number(),
    riskFreeRate: z.number(),
    lambda: z.number(),
    objective: z.enum(["sharpe", "minVol", "maxReturn"]),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickersData, expectedReturns, maxWeight, riskFreeRate, lambda, objective } =
            requestSchema.parse(body);

        if (tickersData.length !== expectedReturns.length) {
            return NextResponse.json(
                { error: "Mismatch between tickers and expected returns" },
                { status: 400 }
            );
        }

        const covMatrix = calculateCovarianceMatrix(tickersData as TickerData[]);

        const params: SAParams = {
            maxWeight,
            riskFreeRate,
            lambda,
            objective: objective as "sharpe" | "minVol" | "maxReturn",
        };

        const result = simulatedAnnealing(expectedReturns, covMatrix, params);

        return NextResponse.json({
            weights: result.weights,
            expectedReturn: result.expectedReturn,
            volatility: result.volatility,
            sharpe: result.sharpe,
            iterations: result.iterations,
            covMatrix,
            message: "Portfolio optimized successfully",
        });
    } catch (error: any) {
        console.error("Optimization error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to optimize portfolio" },
            { status: 500 }
        );
    }
}
