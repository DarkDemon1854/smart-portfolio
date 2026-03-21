"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LightBeamButton } from "@/components/ui/light-beam-button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog } from "@/components/ui/dialog";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, PieChart, Loader2, AlertTriangle } from "lucide-react";
import { Select } from "@/components/ui/select";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";

export default function PortfolioPage() {
    const [positions, setPositions] = useState<any[]>([]);
    const [summary, setSummary] = useState<any>(null);
    const [performance, setPerformance] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [sellModal, setSellModal] = useState<{ open: boolean; ticker: string; maxQty: number }>({ open: false, ticker: "", maxQty: 0 });
    const [sellQty, setSellQty] = useState("");
    const [selling, setSelling] = useState(false);
    const [projEnd, setProjEnd] = useState("");
    const [projMethod, setProjMethod] = useState("deterministic");
    const [projResult, setProjResult] = useState<any>(null);
    const [projLoading, setProjLoading] = useState(false);
    const [confirmSellAll, setConfirmSellAll] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [posRes, perfRes] = await Promise.all([
                fetch("/api/portfolio/positions"),
                fetch("/api/portfolio/performance?from=2020-01-01&to=2030-12-31"),
            ]);
            const posData = await posRes.json();
            const perfData = await perfRes.json();
            if (posRes.ok) {
                setPositions(posData.positions || []);
                setSummary(posData.summary || null);
            }
            if (perfRes.ok) {
                setPerformance(perfData.data || []);
            }
        } catch { } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const fmtPct = (pct: number) => `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%`;

    const handleSell = async () => {
        const qty = parseFloat(sellQty);
        if (!qty || qty <= 0) { toast.error("Enter valid quantity"); return; }
        setSelling(true);
        try {
            const res = await fetch("/api/sell", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ticker: sellModal.ticker, quantity: qty }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Sold ${qty} shares of ${sellModal.ticker}. P/L: ${fmt(data.realizedPnlCents)}`);
            setSellModal({ open: false, ticker: "", maxQty: 0 });
            setSellQty("");
            fetchData();
        } catch (err: any) { toast.error(err.message); }
        finally { setSelling(false); }
    };

    const handleSellAll = async () => {
        setSelling(true);
        try {
            const res = await fetch("/api/sell-all", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Liquidated ${data.positionsSold} positions. Total P/L: ${fmt(data.totalRealizedPnlCents)}`);
            fetchData();
        } catch (err: any) { toast.error(err.message); }
        finally { setSelling(false); }
    };

    const handleProjection = async () => {
        if (!projEnd) { toast.error("Select an end date"); return; }
        setProjLoading(true);
        try {
            const res = await fetch(`/api/portfolio/projection?end=${projEnd}&method=${projMethod}&n=500`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setProjResult(data);
        } catch (err: any) { toast.error(err.message); }
        finally { setProjLoading(false); }
    };

    const perfChartData = performance.map((v) => ({
        date: v.date,
        Total: v.totalCents / 100,
        Cash: v.cashCents / 100,
        Equity: v.equityCents / 100,
    }));

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Portfolio
                    </h1>
                    {positions.length > 0 && (
                        <LightBeamButton onClick={() => setConfirmSellAll(true)} disabled={selling} gradientColors={["#e11d48", "#f43f5e", "#e11d48"]} className="px-6 py-2">
                            {selling ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                            Sell All
                        </LightBeamButton>
                    )}
                </div>

                {summary && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Card glow className="bg-gradient-to-br from-blue-950/50 to-blue-900/30 border-blue-800 backdrop-blur">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-blue-200">Cost Basis</CardTitle></CardHeader>
                            <CardContent><span className="text-lg font-bold text-blue-100">{fmt(summary.totalCostBasisCents)}</span></CardContent>
                        </Card>
                        <Card glow className="bg-gradient-to-br from-purple-950/50 to-purple-900/30 border-purple-800 backdrop-blur">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-purple-200">Market Value</CardTitle></CardHeader>
                            <CardContent><span className="text-lg font-bold text-purple-100">{fmt(summary.currentValueCents)}</span></CardContent>
                        </Card>
                        <Card glow className={`bg-gradient-to-br backdrop-blur ${summary.unrealizedPnlCents >= 0 ? "from-emerald-950/50 to-emerald-900/30 border-emerald-800" : "from-red-950/50 to-red-900/30 border-red-800"}`}>
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-slate-200">Unrealized P/L</CardTitle></CardHeader>
                            <CardContent>
                                <span className={`text-lg font-bold ${summary.unrealizedPnlCents >= 0 ? "text-emerald-100" : "text-red-100"}`}>
                                    {fmt(summary.unrealizedPnlCents)}
                                </span>
                            </CardContent>
                        </Card>
                        <Card glow className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/30 border-emerald-800 backdrop-blur">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-emerald-200">Cash</CardTitle></CardHeader>
                            <CardContent><span className="text-lg font-bold text-emerald-100">{fmt(summary.cashCents)}</span></CardContent>
                        </Card>
                        <Card glow className="bg-gradient-to-br from-amber-950/50 to-amber-900/30 border-amber-800 backdrop-blur">
                            <CardHeader className="pb-2"><CardTitle className="text-xs font-medium text-amber-200">Total Equity</CardTitle></CardHeader>
                            <CardContent><span className="text-lg font-bold text-amber-100">{fmt(summary.totalEquityCents)}</span></CardContent>
                        </Card>
                    </div>
                )}

                <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-slate-100">Positions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {positions.length === 0 ? (
                            <p className="text-slate-400 text-sm">No positions. Invest from the Dashboard to get started.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Ticker</TableHead>
                                        <TableHead>Qty</TableHead>
                                        <TableHead>Avg Cost</TableHead>
                                        <TableHead>Price</TableHead>
                                        <TableHead>Mkt Value</TableHead>
                                        <TableHead>P/L</TableHead>
                                        <TableHead>P/L %</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {positions.map((pos: any) => (
                                        <TableRow key={pos.id}>
                                            <TableCell className="font-medium">{pos.ticker}</TableCell>
                                            <TableCell>{pos.quantity.toFixed(4)}</TableCell>
                                            <TableCell>{fmt(pos.avgCostCents)}</TableCell>
                                            <TableCell>{fmt(pos.currentPriceCents)}</TableCell>
                                            <TableCell>{fmt(pos.marketValueCents)}</TableCell>
                                            <TableCell className={pos.unrealizedPnlCents >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                {fmt(pos.unrealizedPnlCents)}
                                            </TableCell>
                                            <TableCell className={pos.unrealizedPnlPct >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                {fmtPct(pos.unrealizedPnlPct)}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSellModal({ open: true, ticker: pos.ticker, maxQty: pos.quantity });
                                                        setSellQty(pos.quantity.toString());
                                                    }}
                                                >
                                                    Sell
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>

                {perfChartData.length > 0 && (
                    <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                        <CardHeader><CardTitle className="text-slate-100">Equity Over Time</CardTitle></CardHeader>
                        <CardContent>
                            <ResponsiveContainer width="100%" height={300}>
                                <AreaChart data={perfChartData}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="date" stroke="#94a3b8" />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                                    <Legend />
                                    <Area type="monotone" dataKey="Total" stroke="#3b82f6" fill="#3b82f640" strokeWidth={2} />
                                    <Area type="monotone" dataKey="Cash" stroke="#10b981" fill="#10b98120" strokeWidth={1} />
                                    <Area type="monotone" dataKey="Equity" stroke="#8b5cf6" fill="#8b5cf620" strokeWidth={1} />
                                </AreaChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                )}

                <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                    <CardHeader><CardTitle className="text-slate-100">Future Projection</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-1 block">End Date</label>
                                <Input
                                    type="date"
                                    value={projEnd}
                                    onChange={(e) => setProjEnd(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-1 block">Method</label>
                                <Select value={projMethod} onChange={(e) => setProjMethod(e.target.value)} className="bg-slate-800 border-slate-700">
                                    <option value="deterministic">Deterministic</option>
                                    <option value="mc">Monte Carlo</option>
                                </Select>
                            </div>
                            <div className="flex items-end">
                                <LightBeamButton onClick={handleProjection} disabled={projLoading} className="w-full">
                                    {projLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Run Projection
                                </LightBeamButton>
                            </div>
                        </div>

                        {projResult && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                                <Card glow className="bg-slate-800/50 border-slate-700">
                                    <CardContent className="pt-4">
                                        <p className="text-xs text-slate-400">Current Value</p>
                                        <p className="text-lg font-bold text-slate-100">${projResult.currentValue?.toFixed(2)}</p>
                                    </CardContent>
                                </Card>
                                {projResult.method === "deterministic" ? (
                                    <Card glow className="bg-slate-800/50 border-slate-700">
                                        <CardContent className="pt-4">
                                            <p className="text-xs text-slate-400">Projected Value ({projResult.days} days)</p>
                                            <p className="text-lg font-bold text-emerald-400">${projResult.projectedValue?.toFixed(2)}</p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <>
                                        <Card glow className="bg-slate-800/50 border-slate-700">
                                            <CardContent className="pt-4">
                                                <p className="text-xs text-slate-400">Median (p50)</p>
                                                <p className="text-lg font-bold text-blue-400">${projResult.median?.toFixed(2)}</p>
                                                <p className="text-xs text-slate-500 mt-1">p10: ${projResult.p10?.toFixed(2)} / p90: ${projResult.p90?.toFixed(2)}</p>
                                            </CardContent>
                                        </Card>
                                    </>
                                )}
                                <Card glow className="bg-slate-800/50 border-slate-700">
                                    <CardContent className="pt-4">
                                        <p className="text-xs text-slate-400">Projection Period</p>
                                        <p className="text-lg font-bold text-slate-100">{projResult.days} days</p>
                                        <p className="text-xs text-slate-500 mt-1">{projResult.method === "monteCarlo" ? `${projResult.simulations} simulations` : "Compound growth"}</p>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {projResult?.bands && projResult.bands.length > 0 && (
                            <ResponsiveContainer width="100%" height={250}>
                                <AreaChart data={projResult.bands}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis dataKey="day" stroke="#94a3b8" label={{ value: "Days", position: "insideBottom", offset: -5 }} />
                                    <YAxis stroke="#94a3b8" />
                                    <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                                    <Area type="monotone" dataKey="p90" stroke="#10b981" fill="#10b98120" name="90th pct" />
                                    <Area type="monotone" dataKey="median" stroke="#3b82f6" fill="#3b82f640" name="Median" strokeWidth={2} />
                                    <Area type="monotone" dataKey="p10" stroke="#ef4444" fill="#ef444420" name="10th pct" />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </CardContent>
                </Card>

                <Dialog open={sellModal.open} onClose={() => setSellModal({ open: false, ticker: "", maxQty: 0 })} title={`Sell ${sellModal.ticker}`}>
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium text-slate-300 mb-1 block">Quantity (max: {sellModal.maxQty.toFixed(4)})</label>
                            <Input
                                type="number"
                                value={sellQty}
                                onChange={(e) => setSellQty(e.target.value)}
                                className="bg-slate-800 border-slate-700"
                                max={sellModal.maxQty}
                                step="0.0001"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleSell} disabled={selling} className="flex-1">
                                {selling ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Confirm Sell
                            </Button>
                            <Button variant="outline" onClick={() => setSellModal({ open: false, ticker: "", maxQty: 0 })} className="flex-1">
                                Cancel
                            </Button>
                        </div>
                    </div>
                </Dialog>
                <ConfirmDialog
                    open={confirmSellAll}
                    onClose={() => setConfirmSellAll(false)}
                    onConfirm={handleSellAll}
                    title="Confirm Sell All"
                    description={`This will liquidate all ${positions.length} position(s) at current market prices. This action cannot be undone.`}
                    confirmText="Sell All Positions"
                    destructive
                />
            </div>
        </div>
    );
}
