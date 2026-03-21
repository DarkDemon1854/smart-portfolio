import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { ensureUser } from "@/lib/db";

const schema = z.object({
    amountCents: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { amountCents } = schema.parse(body);
        const { user, wallet } = await ensureUser();

        if (wallet.cashCents < amountCents) {
            return NextResponse.json(
                { error: "Insufficient cash balance" },
                { status: 400 }
            );
        }

        const updated = await prisma.wallet.update({
            where: { id: wallet.id },
            data: { cashCents: { decrement: amountCents } },
        });

        await prisma.walletLedger.create({
            data: {
                walletId: wallet.id,
                userId: user.id,
                type: "WITHDRAW",
                amountCents: -amountCents,
                metaJson: JSON.stringify({ note: "Cash withdrawal" }),
            },
        });

        return NextResponse.json({ cashCents: updated.cashCents });
    } catch (error: any) {
        return NextResponse.json(
            { error: error.message || "Withdrawal failed" },
            { status: 400 }
        );
    }
}
