import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

const db = prisma as any;

export async function GET() {
    try {
        const row = await db.setting.findUnique({ where: { key: "prediction_cache" } });
        if (!row) {
            return NextResponse.json({ cache: null });
        }
        return NextResponse.json({ cache: JSON.parse(row.value) });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
