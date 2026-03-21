"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TrendingUp, TrendingDown, Loader2, ShieldAlert } from "lucide-react";
import { LightBeamButton } from "@/components/ui/light-beam-button";
import { toast } from "sonner";

interface AutoTradeCardProps {
    model: string;
    maxWeight: number;
    objective: string;
    buyThreshold: string;
    autoCycleBudget: string;
    cycleAmount: string;
    cycleLoading: boolean;
    cycleResult: any;
    lastRunAt: Date | null;
    autoAmount: string;
    autoLoading: boolean;
    autoResult: any;
    autoCashoutResult: any;
    autoThreshold: string;
    cronSecret: string;
    cronLookback: string;
    cronSaving: boolean;
    cronWebhookHost: string;
    cronLastRun: string | null;
    stopLossPercent: string;
    stopLossLoading: boolean;
    stopLossResult: any;
    setBuyThreshold: (v: string) => void;
    setAutoCycleBudget: (v: string) => void;
    setCycleAmount: (v: string) => void;
    setAutoAmount: (v: string) => void;
    setAutoThreshold: (v: string) => void;
    setCronSecret: (v: string) => void;
    setCronLookback: (v: string) => void;
    setStopLossPercent: (v: string) => void;
    onSmartCycle: () => void;
    onSaveCronConfig: () => void;
    onAutoBuy: () => void;
    onAutoSell: () => void;
    onStopLossCheck: () => void;
}

export function AutoTradeCard(props: AutoTradeCardProps) {
    return (
        <Card glow className="bg-gradient-to-br from-violet-950/40 to-rose-950/40 border-violet-800/50 backdrop-blur">
            <CardHeader>
                <CardTitle className="text-violet-100 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-violet-400" /> Auto Trade
                </CardTitle>
                <CardDescription>AI runs train, optimize, and execute in one click</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-violet-950/40 border border-violet-700/50 space-y-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-violet-200">Smart Cycle</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-violet-800/60 text-violet-300 uppercase tracking-wide">recommended</span>
                    </div>

                    <p className="text-xs text-slate-400">
                        Predicts returns, sells bearish positions, buys bullish ones with SA-optimized weights.
                    </p>

                    <div className="p-3 rounded-md bg-slate-900/40 border border-violet-800/30 space-y-2">
                        <label className="text-xs text-slate-400">Budget per cycle (USD)</label>
                        <Input
                            type="number"
                            placeholder="e.g. 500"
                            value={props.autoCycleBudget}
                            onChange={(e) => props.setAutoCycleBudget(e.target.value)}
                            className="bg-slate-800 border-slate-700"
                            min="0" step="0.01"
                        />
                        <label className="text-xs text-slate-400">
                            Min buy signal (%) — only buy if model predicts this return or higher
                        </label>
                        <div className="flex items-center gap-2">
                            <Input
                                type="number"
                                placeholder="0.5"
                                value={props.buyThreshold}
                                onChange={(e) => props.setBuyThreshold(e.target.value)}
                                className="bg-slate-800 border-slate-700 w-24"
                                min="0" max="10" step="0.1"
                            />
                            <span className="text-xs text-slate-500">% predicted return</span>
                        </div>
                        <div className="flex items-center justify-between pt-1">
                            <p className="text-[10px] text-slate-500">
                                Model: <span className="text-violet-400">{props.model}</span> ·
                                Objective: <span className="text-violet-400">{props.objective}</span> ·
                                Max W: <span className="text-violet-400">{(props.maxWeight * 100).toFixed(0)}%</span> ·
                                Buy if &ge; <span className="text-violet-400">{props.buyThreshold || "0.5"}%</span>
                            </p>
                            <button
                                onClick={props.onSaveCronConfig}
                                disabled={props.cronSaving}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-medium bg-violet-800/40 text-violet-300 border border-violet-700/50 hover:bg-violet-700/50 transition-colors disabled:opacity-50"
                            >
                                {props.cronSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                {props.cronSaving ? "Saving..." : "Save to Cron"}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Manual budget USD"
                            value={props.cycleAmount}
                            onChange={(e) => props.setCycleAmount(e.target.value)}
                            className="bg-slate-800 border-slate-700 flex-1"
                            min="0" step="0.01"
                        />
                        <LightBeamButton
                            onClick={props.onSmartCycle}
                            disabled={props.cycleLoading}
                            gradientColors={["#7c3aed", "#a855f7", "#7c3aed"]}
                        >
                            {props.cycleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                            Run Now
                        </LightBeamButton>
                    </div>

                    {props.lastRunAt && (
                        <p className="text-[10px] text-slate-500">Last ran: {props.lastRunAt.toLocaleTimeString()} on {props.lastRunAt.toLocaleDateString()}</p>
                    )}

                    {props.cycleResult && (
                        <div className="rounded-md bg-slate-800/50 p-3 space-y-3">
                            {props.cycleResult.soldTickers?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-rose-300 mb-1">Sold (bearish signals)</p>
                                    {props.cycleResult.soldTickers.map((s: any) => (
                                        <div key={s.ticker} className="flex justify-between text-xs py-0.5">
                                            <span className="text-slate-300">{s.ticker}</span>
                                            <span className="text-rose-400">{(s.predictedReturn * 100).toFixed(3)}%</span>
                                            <span className="text-slate-400">${(s.proceedsCents / 100).toFixed(2)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {props.cycleResult.boughtTickers?.length > 0 && (
                                <div>
                                    <p className="text-xs font-semibold text-emerald-300 mb-1">Bought (bullish signals)</p>
                                    {props.cycleResult.boughtTickers.map((b: any) => (
                                        <div key={b.ticker} className="flex justify-between text-xs py-0.5">
                                            <span className="text-slate-300">{b.ticker}</span>
                                            <span className="text-emerald-400">{(b.predictedReturn * 100).toFixed(3)}%</span>
                                            <span className="text-slate-400">{(b.weight * 100).toFixed(1)}% weight</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {props.cycleResult.message && (
                                <p className="text-xs text-slate-400">{props.cycleResult.message}</p>
                            )}
                            <div className="flex justify-between text-xs border-t border-slate-700 pt-2">
                                <span className="text-slate-400">Cash remaining</span>
                                <span className="text-slate-200 font-medium">${(props.cycleResult.cashCents / 100).toFixed(2)}</span>
                            </div>
                        </div>
                    )}
                </div>

                <details className="group">
                    <summary className="text-xs text-slate-500 cursor-pointer select-none hover:text-slate-300">Manual controls (Auto Buy / Auto Sell separately)</summary>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-3 p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
                            <p className="text-sm font-semibold text-emerald-300">Auto Buy</p>
                            <p className="text-xs text-slate-400">Trains the model, optimizes weights, and invests automatically.</p>
                            <div className="flex gap-2">
                                <Input
                                    type="number"
                                    placeholder="Amount USD"
                                    value={props.autoAmount}
                                    onChange={(e) => props.setAutoAmount(e.target.value)}
                                    className="bg-slate-800 border-slate-700 flex-1"
                                    min="0" step="0.01"
                                />
                                <LightBeamButton onClick={props.onAutoBuy} disabled={props.autoLoading} gradientColors={["#10b981", "#06b6d4", "#10b981"]}>
                                    {props.autoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="h-4 w-4" />}
                                    Auto Buy
                                </LightBeamButton>
                            </div>
                            {props.autoResult && (
                                <div className="rounded-md bg-slate-800/50 p-3 space-y-1">
                                    <p className="text-xs text-slate-400">Invested: <span className="text-emerald-400 font-medium">${(props.autoResult.totalInvestedCents / 100).toFixed(2)}</span></p>
                                    <p className="text-xs text-slate-400">Sharpe: <span className="text-emerald-400 font-medium">{props.autoResult.portfolioSharpe?.toFixed(3)}</span></p>
                                    <p className="text-xs text-slate-400">Bought: <span className="text-emerald-400 font-medium">{props.autoResult.boughtTickers?.join(", ") || props.autoResult.trades?.length + " trades"}</span></p>
                                    {props.autoResult.skippedTickers?.length > 0 && (
                                        <p className="text-xs text-slate-400">Skipped (bearish): <span className="text-rose-400">{props.autoResult.skippedTickers.map((s: any) => s.ticker).join(", ")}</span></p>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="space-y-3 p-4 rounded-lg bg-rose-950/30 border border-rose-800/40">
                            <p className="text-sm font-semibold text-rose-300">Auto Sell</p>
                            <p className="text-xs text-slate-400">
                                Sells any ticker the model predicts will <span className="text-rose-300 font-medium">go negative</span>.
                            </p>
                            <LightBeamButton onClick={props.onAutoSell} disabled={props.autoLoading} className="w-full" gradientColors={["#e11d48", "#f43f5e", "#e11d48"]}>
                                {props.autoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingDown className="h-4 w-4" />}
                                Auto Sell (AI Decides)
                            </LightBeamButton>
                            <details className="group">
                                <summary className="text-xs text-slate-500 cursor-pointer select-none hover:text-slate-300">Advanced: override threshold</summary>
                                <div className="mt-2 flex flex-col gap-1">
                                    <label className="text-xs text-slate-400">Sell if predicted return is below (%)</label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={props.autoThreshold}
                                        onChange={(e) => props.setAutoThreshold(e.target.value)}
                                        className="bg-slate-800 border-slate-700"
                                        step="0.1"
                                    />
                                </div>
                            </details>
                            {props.autoCashoutResult && (
                                <div className="rounded-md bg-slate-800/50 p-3 space-y-2">
                                    {props.autoCashoutResult.soldTickers?.length > 0 ? (
                                        <>
                                            <p className="text-xs text-slate-400">Proceeds: <span className="text-rose-400 font-medium">${(props.autoCashoutResult.totalProceedsCents / 100).toFixed(2)}</span></p>
                                            <p className="text-xs text-slate-400">Realized P&L: <span className={props.autoCashoutResult.totalRealizedPnlCents >= 0 ? "text-emerald-400 font-medium" : "text-red-400 font-medium"}>${(props.autoCashoutResult.totalRealizedPnlCents / 100).toFixed(2)}</span></p>
                                            <div className="space-y-1">
                                                {props.autoCashoutResult.soldTickers.map((s: any) => (
                                                    <div key={s.ticker} className="flex justify-between text-xs">
                                                        <span className="text-slate-300">{s.ticker}</span>
                                                        <span className="text-rose-300">{(s.predictedReturn * 100).toFixed(3)}%</span>
                                                        <span className="text-slate-400">${(s.proceedsCents / 100).toFixed(2)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-xs text-slate-400">{props.autoCashoutResult.message}</p>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </details>

                <div className="p-4 rounded-lg bg-amber-950/30 border border-amber-800/40 space-y-3">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-amber-400" />
                        <span className="text-sm font-bold text-amber-200">Stop-Loss Protection</span>
                    </div>
                    <p className="text-xs text-slate-400">
                        Automatically sells any position that drops below your set loss limit. Works with cron too.
                    </p>
                    <div className="flex items-center gap-2">
                        <Input
                            type="number"
                            placeholder="e.g. 5"
                            value={props.stopLossPercent}
                            onChange={(e) => props.setStopLossPercent(e.target.value)}
                            className="bg-slate-800 border-slate-700 w-24"
                            min="1" max="100" step="1"
                        />
                        <span className="text-xs text-slate-500">% max loss before auto-sell</span>
                    </div>
                    <Button
                        onClick={props.onStopLossCheck}
                        disabled={props.stopLossLoading}
                        className="w-full bg-amber-600 hover:bg-amber-700"
                    >
                        {props.stopLossLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
                        Check & Sell Losers Now
                    </Button>
                    {props.stopLossResult && (
                        <div className="rounded-md bg-slate-800/50 p-3 space-y-2">
                            <p className="text-xs text-slate-400">{props.stopLossResult.message}</p>
                            {props.stopLossResult.soldTickers?.length > 0 && (
                                <>
                                    <p className="text-xs text-slate-400">
                                        Realized P&L: <span className="text-red-400 font-medium">${(props.stopLossResult.totalRealizedPnlCents / 100).toFixed(2)}</span>
                                    </p>
                                    <div className="space-y-1">
                                        {props.stopLossResult.soldTickers.map((s: any) => (
                                            <div key={s.ticker} className="flex justify-between text-xs">
                                                <span className="text-slate-300">{s.ticker}</span>
                                                <span className="text-red-400">-{s.lossPercent}%</span>
                                                <span className="text-slate-400">${(s.proceedsCents / 100).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
