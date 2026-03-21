"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LightBeamButton } from "@/components/ui/light-beam-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Loader2, TrendingUp, Radio } from "lucide-react";
import { toast } from "sonner";
import { CompanySelect } from "@/components/company-select";

export default function ChartsPage() {
    const [ticker, setTicker] = useState("AAPL");
    const [fromDate, setFromDate] = useState("2023-01-01");
    const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [interval, setInterval] = useState("1d");
    const [prices, setPrices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showMA5, setShowMA5] = useState(true);
    const [showMA10, setShowMA10] = useState(true);
    const [showMA20, setShowMA20] = useState(false);

    // Live Mode state
    const [liveMode, setLiveMode] = useState(false);
    const [livePrice, setLivePrice] = useState<number | null>(null);
    const [prevLivePrice, setPrevLivePrice] = useState<number | null>(null);
    const [lastUpdated, setLastUpdated] = useState<string | null>(null);
    const [refreshInterval, setRefreshInterval] = useState(5);
    const liveTimerRef = useRef<NodeJS.Timeout | null>(null);

    const fetchChart = async (silent = false) => {
        if (!ticker) { toast.error("Enter a ticker"); return; }
        if (!silent) setLoading(true);
        try {
            const params = new URLSearchParams({ ticker: ticker.toUpperCase(), from: fromDate, to: toDate, interval });
            const res = await fetch(`/api/chart?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setPrices(data.prices || []);
            if (data.prices && data.prices.length > 0) {
                const latest = data.prices[data.prices.length - 1];
                setPrevLivePrice(livePrice);
                setLivePrice(latest.close);
                setLastUpdated(new Date().toLocaleTimeString());
            }
            if (!silent && data.prices.length === 0) toast.warning("No data returned for this range");
        } catch (err: any) { if (!silent) toast.error(err.message); }
        finally { if (!silent) setLoading(false); }
    };

    // Live Mode polling
    const startLivePolling = useCallback(() => {
        if (liveTimerRef.current) clearInterval(liveTimerRef.current);
        liveTimerRef.current = globalThis.setInterval(() => {
            fetchChart(true);
        }, refreshInterval * 1000);
    }, [ticker, fromDate, toDate, interval, refreshInterval]);

    useEffect(() => {
        if (liveMode && prices.length > 0) {
            startLivePolling();
        } else {
            if (liveTimerRef.current) {
                clearInterval(liveTimerRef.current);
                liveTimerRef.current = null;
            }
        }
        return () => {
            if (liveTimerRef.current) {
                clearInterval(liveTimerRef.current);
                liveTimerRef.current = null;
            }
        };
    }, [liveMode, startLivePolling, prices.length]);

    // Reset live mode when ticker changes
    useEffect(() => {
        setLiveMode(false);
        setLivePrice(null);
        setPrevLivePrice(null);
        setLastUpdated(null);
    }, [ticker]);

    const computeMA = (data: any[], window: number) => {
        return data.map((_, i) => {
            if (i < window - 1) return null;
            const slice = data.slice(i - window + 1, i + 1);
            return slice.reduce((sum: number, d: any) => sum + d.close, 0) / window;
        });
    };

    const ma5 = computeMA(prices, 5);
    const ma10 = computeMA(prices, 10);
    const ma20 = computeMA(prices, 20);

    const chartData = prices.map((p, i) => ({
        date: p.date,
        Close: p.close,
        Volume: p.volume,
        MA5: showMA5 ? ma5[i] : null,
        MA10: showMA10 ? ma10[i] : null,
        MA20: showMA20 ? ma20[i] : null,
    }));

    const priceChange = livePrice && prevLivePrice ? livePrice - prevLivePrice : 0;
    const priceChangeColor = priceChange > 0 ? "text-emerald-400" : priceChange < 0 ? "text-red-400" : "text-slate-400";

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        Stock Chart Explorer
                    </h1>
                    {liveMode && (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30">
                            <span className="relative flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                            <span className="text-xs text-emerald-400 font-medium">
                                LIVE — {ticker.toUpperCase()}
                            </span>
                            {lastUpdated && (
                                <span className="text-[10px] text-emerald-600">updated {lastUpdated}</span>
                            )}
                        </div>
                    )}
                </div>

                {/* Live Price Banner */}
                {liveMode && livePrice !== null && (
                    <Card glow className="bg-gradient-to-r from-slate-900/80 to-emerald-950/30 border-emerald-800/40 backdrop-blur">
                        <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div>
                                    <p className="text-xs text-slate-400">{ticker.toUpperCase()} Live Price</p>
                                    <p className="text-3xl font-bold text-slate-100">${livePrice.toFixed(2)}</p>
                                </div>
                                {priceChange !== 0 && (
                                    <div className={`text-lg font-semibold ${priceChangeColor}`}>
                                        {priceChange > 0 ? "+" : ""}{priceChange.toFixed(2)}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500">Refresh every</p>
                                    <Select
                                        value={String(refreshInterval)}
                                        onChange={(e) => setRefreshInterval(Number(e.target.value))}
                                        className="bg-slate-800 border-slate-700 text-xs h-7 w-20"
                                    >
                                        <option value="3">3s</option>
                                        <option value="5">5s</option>
                                        <option value="10">10s</option>
                                        <option value="30">30s</option>
                                        <option value="60">60s</option>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                    <CardHeader>
                        <CardTitle className="text-slate-100 flex items-center gap-2">
                            <TrendingUp className="h-5 w-5 text-blue-400" /> Chart Settings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-1 block">Company</label>
                                <CompanySelect
                                    value={ticker}
                                    onChange={(symbol) => setTicker(symbol)}
                                    placeholder="Select a company..."
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-1 block">From</label>
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-1 block">To</label>
                                <Input
                                    type="date"
                                    value={toDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    className="bg-slate-800 border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-1 block">Interval</label>
                                <Select value={interval} onChange={(e) => setInterval(e.target.value)} className="bg-slate-800 border-slate-700">
                                    <option value="1d">1 Day</option>
                                    <option value="1wk">1 Week</option>
                                </Select>
                            </div>
                            <div className="flex items-end gap-2">
                                <LightBeamButton onClick={() => fetchChart(false)} disabled={loading} className="flex-1">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Fetch
                                </LightBeamButton>
                            </div>
                        </div>
                        <div className="flex gap-4 items-center flex-wrap">
                            <label className="flex items-center gap-1.5 text-sm text-slate-300">
                                <input type="checkbox" checked={showMA5} onChange={(e) => setShowMA5(e.target.checked)} className="w-3.5 h-3.5" />
                                MA5
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-slate-300">
                                <input type="checkbox" checked={showMA10} onChange={(e) => setShowMA10(e.target.checked)} className="w-3.5 h-3.5" />
                                MA10
                            </label>
                            <label className="flex items-center gap-1.5 text-sm text-slate-300">
                                <input type="checkbox" checked={showMA20} onChange={(e) => setShowMA20(e.target.checked)} className="w-3.5 h-3.5" />
                                MA20
                            </label>

                            <div className="ml-auto">
                                <button
                                    onClick={() => {
                                        if (!prices.length) {
                                            toast.error("Fetch chart data first before enabling Live Mode");
                                            return;
                                        }
                                        setLiveMode(!liveMode);
                                        if (!liveMode) toast.success("Live Mode enabled — chart updates every " + refreshInterval + "s");
                                        else toast("Live Mode disabled");
                                    }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${liveMode
                                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-lg shadow-emerald-500/10"
                                        : "bg-slate-800 text-slate-400 border border-slate-700 hover:border-emerald-600 hover:text-emerald-400"
                                        }`}
                                >
                                    {liveMode && (
                                        <span className="relative flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    )}
                                    {!liveMode && <Radio className="h-4 w-4" />}
                                    {liveMode ? "Live ON" : "Live Mode"}
                                </button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {chartData.length > 0 && (
                    <>
                        <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="text-slate-100 flex items-center gap-2">
                                    {ticker.toUpperCase()} — Close Price
                                    {liveMode && (
                                        <span className="relative flex h-2 w-2 ml-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                    )}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis stroke="#94a3b8" domain={["auto", "auto"]} />
                                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="Close" stroke="#3b82f6" dot={false} strokeWidth={2} isAnimationActive={!liveMode} />
                                        {showMA5 && <Line type="monotone" dataKey="MA5" stroke="#f59e0b" dot={false} strokeWidth={1} strokeDasharray="4 2" isAnimationActive={!liveMode} />}
                                        {showMA10 && <Line type="monotone" dataKey="MA10" stroke="#ec4899" dot={false} strokeWidth={1} strokeDasharray="4 2" isAnimationActive={!liveMode} />}
                                        {showMA20 && <Line type="monotone" dataKey="MA20" stroke="#10b981" dot={false} strokeWidth={1} strokeDasharray="4 2" isAnimationActive={!liveMode} />}
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>

                        <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                            <CardHeader>
                                <CardTitle className="text-slate-100">{ticker.toUpperCase()} — Volume</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                        <XAxis dataKey="date" stroke="#94a3b8" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                                        <Bar dataKey="Volume" fill="#3b82f640" stroke="#3b82f6" isAnimationActive={!liveMode} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    </>
                )}
            </div>
        </div>
    );
}
