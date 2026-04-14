import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import * as XLSX from "xlsx";
import { DEMO_DATA } from "@/lib/finance";
import { fetchYahooData } from "@/lib/yahoo";

const requestSchema = z.object({
    tickers: z.array(z.string().min(1)),
    startDate: z.string(),
    endDate: z.string(),
    format: z.enum(["csv", "xlsx"]).default("csv"),
    demoMode: z.boolean().default(false),
});

type ExportRow = {
    ticker: string;
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
};

function toCsv(rows: ExportRow[]): string {
    const headers = ["ticker", "date", "open", "high", "low", "close", "volume"];
    const body = rows.map((r) => [r.ticker, `="${r.date}"`, r.open, r.high, r.low, r.close, r.volume].join(","));
    return [headers.join(","), ...body].join("\n");
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { tickers, startDate, endDate, format, demoMode } = requestSchema.parse(body);

        const exportRows: ExportRow[] = [];

        if (demoMode) {
            for (const ticker of tickers) {
                const rows = (DEMO_DATA[ticker] || []).filter((p) => p.date >= startDate && p.date <= endDate);
                for (const p of rows) {
                    exportRows.push({
                        ticker,
                        date: p.date,
                        open: p.open,
                        high: p.high,
                        low: p.low,
                        close: p.close,
                        volume: p.volume,
                    });
                }
            }
        } else {
            for (const ticker of tickers) {
                try {
                    const rows = await fetchYahooData(ticker, startDate, endDate);
                    for (const p of rows) {
                        exportRows.push({
                            ticker,
                            date: p.date,
                            open: p.open,
                            high: p.high,
                            low: p.low,
                            close: p.close,
                            volume: p.volume,
                        });
                    }
                } catch {
                }
            }
        }

        if (exportRows.length === 0) {
            return NextResponse.json(
                { error: "No rows available for the selected tickers and date range." },
                { status: 400 }
            );
        }

        exportRows.sort((a, b) => {
            if (a.ticker === b.ticker) return a.date.localeCompare(b.date);
            return a.ticker.localeCompare(b.ticker);
        });

        const safeStart = startDate.replace(/[^0-9-]/g, "");
        const safeEnd = endDate.replace(/[^0-9-]/g, "");
        const baseName = `yahoo-data-${safeStart}-to-${safeEnd}`;

        if (format === "csv") {
            const csv = toCsv(exportRows);
            return new NextResponse(csv, {
                status: 200,
                headers: {
                    "Content-Type": "text/csv; charset=utf-8",
                    "Content-Disposition": `attachment; filename=\"${baseName}.csv\"`,
                    "Cache-Control": "no-store",
                },
            });
        }

        const worksheet = XLSX.utils.json_to_sheet(exportRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "YahooData");
        const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename=\"${baseName}.xlsx\"`,
                "Cache-Control": "no-store",
            },
        });
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to export data" },
            { status: 500 }
        );
    }
}
