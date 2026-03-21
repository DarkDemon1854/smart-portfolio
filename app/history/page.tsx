"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LightBeamButton } from "@/components/ui/light-beam-button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

export default function HistoryPage() {
    const [trades, setTrades] = useState<any[]>([]);
    const [ledger, setLedger] = useState<any[]>([]);
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [tickerFilter, setTickerFilter] = useState("");
    const [loading, setLoading] = useState(false);

    const fetchTrades = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.set("from", fromDate);
            if (toDate) params.set("to", toDate);
            if (tickerFilter) params.set("ticker", tickerFilter.toUpperCase());
            const res = await fetch(`/api/history/trades?${params.toString()}`);
            const data = await res.json();
            if (res.ok) setTrades(data.trades || []);
        } catch { } finally { setLoading(false); }
    };

    const fetchLedger = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (fromDate) params.set("from", fromDate);
            if (toDate) params.set("to", toDate);
            const res = await fetch(`/api/history/ledger?${params.toString()}`);
            const data = await res.json();
            if (res.ok) setLedger(data.ledger || []);
        } catch { } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTrades();
        fetchLedger();
    }, []);

    const fmt = (cents: number) => `$${(Math.abs(cents) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const tradesContent = (
        <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
                <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 max-w-[160px]"
                    placeholder="From"
                />
                <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 max-w-[160px]"
                    placeholder="To"
                />
                <Input
                    value={tickerFilter}
                    onChange={(e) => setTickerFilter(e.target.value)}
                    className="bg-slate-800 border-slate-700 max-w-[120px]"
                    placeholder="Ticker"
                />
                <LightBeamButton onClick={fetchTrades} disabled={loading} className="px-6 py-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Filter"}
                </LightBeamButton>
            </div>
            {trades.length === 0 ? (
                <p className="text-slate-400 text-sm">No trades found.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Ticker</TableHead>
                            <TableHead>Side</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Value</TableHead>
                            <TableHead>Fees</TableHead>
                            <TableHead>Realized P/L</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {trades.map((t: any) => (
                            <TableRow key={t.id}>
                                <TableCell className="text-slate-400 text-sm">{new Date(t.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell className="font-medium">{t.ticker}</TableCell>
                                <TableCell>
                                    <Badge variant={t.side === "BUY" ? "default" : "destructive"}>{t.side}</Badge>
                                </TableCell>
                                <TableCell>{fmt(t.priceCents)}</TableCell>
                                <TableCell>{t.quantity.toFixed(4)}</TableCell>
                                <TableCell>{fmt(t.valueCents)}</TableCell>
                                <TableCell>{fmt(t.feesCents)}</TableCell>
                                <TableCell className={t.realizedPnlCents >= 0 ? "text-emerald-400" : "text-red-400"}>
                                    {t.side === "SELL" ? (t.realizedPnlCents >= 0 ? "+" : "-") + fmt(t.realizedPnlCents) : "-"}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );

    const ledgerContent = (
        <div className="space-y-4">
            <div className="flex gap-3 flex-wrap">
                <Input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 max-w-[160px]"
                />
                <Input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className="bg-slate-800 border-slate-700 max-w-[160px]"
                />
                <LightBeamButton onClick={fetchLedger} disabled={loading} className="px-6 py-2">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Filter"}
                </LightBeamButton>
            </div>
            {ledger.length === 0 ? (
                <p className="text-slate-400 text-sm">No ledger entries found.</p>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Note</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {ledger.map((entry: any) => (
                            <TableRow key={entry.id}>
                                <TableCell className="text-slate-400 text-sm">{new Date(entry.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <Badge variant={entry.amountCents >= 0 ? "default" : "destructive"}>{entry.type}</Badge>
                                </TableCell>
                                <TableCell className={entry.amountCents >= 0 ? "text-emerald-400" : "text-red-400"}>
                                    {entry.amountCents >= 0 ? "+" : ""}{fmt(entry.amountCents)}
                                </TableCell>
                                <TableCell className="text-slate-500 text-sm max-w-[250px] truncate">
                                    {(() => { try { const m = JSON.parse(entry.metaJson); return m.note || m.action || JSON.stringify(m); } catch { return "-"; } })()}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-6 space-y-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    History
                </h1>
                <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                    <CardContent className="pt-6">
                        <Tabs
                            tabs={[
                                { id: "trades", label: "Trades", content: tradesContent },
                                { id: "ledger", label: "Wallet Ledger", content: ledgerContent },
                            ]}
                        />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
