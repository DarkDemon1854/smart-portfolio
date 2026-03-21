import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const db = prisma as any;
const KEY = "user_tickers";

export async function GET() {
    try {
        const row = await db.setting.findUnique({ where: { key: KEY } });
        return NextResponse.json({ tickers: row ? row.value : null });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    try {
        const { tickers } = await request.json();
        if (typeof tickers !== "string" || tickers.trim() === "") {
            return NextResponse.json({ error: "tickers must be a non-empty string" }, { status: 400 });
        }
        await db.setting.upsert({
            where: { key: KEY },
            update: { value: tickers },
            create: { key: KEY, value: tickers },
        });
        return NextResponse.json({ ok: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
