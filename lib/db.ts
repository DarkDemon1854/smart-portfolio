import prisma from "@/lib/prisma";

const DEMO_USER_ID = "demo";

export async function ensureUser() {
    let user = await prisma.user.findUnique({ where: { externalId: DEMO_USER_ID } });
    if (!user) {
        user = await prisma.user.create({ data: { externalId: DEMO_USER_ID } });
    }

    let wallet = await prisma.wallet.findFirst({ where: { userId: user.id } });
    if (!wallet) {
        wallet = await prisma.wallet.create({ data: { userId: user.id, cashCents: 0 } });
    }

    let portfolio = await prisma.portfolio.findFirst({ where: { userId: user.id } });
    if (!portfolio) {
        portfolio = await prisma.portfolio.create({ data: { userId: user.id, name: "Default" } });
    }

    return { user, wallet, portfolio };
}
