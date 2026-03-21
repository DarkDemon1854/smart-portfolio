import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const db = prisma as any;

const CRON_CONFIG_KEY = "cron_config";
const CRON_SECRET_KEY = "cron_secret";

const configSchema = z.object({
    tickers: z.array(z.string().min(1)),
    model: z.enum(["rf", "boosting", "cnn", "ensemble"]),
    maxWeight: z.coerce.number(),
    riskFreeRate: z.coerce.number(),
    lambda: z.coerce.number(),
    objective: z.enum(["sharpe", "minVol", "maxReturn"]),
    amountCents: z.coerce.number().int().positive(),
    lookbackDays: z.coerce.number().int().positive().default(365),
    buyThreshold: z.coerce.number().min(0).max(1).default(0.005),
    stopLossPercent: z.coerce.number().min(0).max(100).default(0),
    secret: z.string().min(8),
});

export async function GET() {
    try {
        const [configRow, secretRow] = await Promise.all([
            db.setting.findUnique({ where: { key: CRON_CONFIG_KEY } }),
            db.setting.findUnique({ where: { key: CRON_SECRET_KEY } }),
        ]);

        if (!configRow) {
            return NextResponse.json({ config: null, secret: secretRow?.value ?? null });
        }

        return NextResponse.json({
            config: JSON.parse(configRow.value),
            secret: secretRow?.value ?? null,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to load cron config" }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const config = configSchema.parse(body);
        const { secret, ...rest } = config;

        await db.setting.upsert({
            where: { key: CRON_CONFIG_KEY },
            update: { value: JSON.stringify(rest) },
            create: { key: CRON_CONFIG_KEY, value: JSON.stringify(rest) },
        });

        await db.setting.upsert({
            where: { key: CRON_SECRET_KEY },
            update: { value: secret },
            create: { key: CRON_SECRET_KEY, value: secret },
        });

        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to save cron config" }, { status: 500 });
    }
}
