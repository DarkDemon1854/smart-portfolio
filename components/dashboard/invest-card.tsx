"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, DollarSign, Loader2 } from "lucide-react";
import { LightBeamButton } from "@/components/ui/light-beam-button";

interface InvestCardProps {
    weights: number[];
    tickerList: string[];
    investAmount: string;
    investing: boolean;
    onInvestAmountChange: (v: string) => void;
    onInvest: () => void;
}

export function InvestCard({ weights, tickerList, investAmount, investing, onInvestAmountChange, onInvest }: InvestCardProps) {
    return (
        <Card glow className="bg-gradient-to-br from-emerald-950/40 to-blue-950/40 border-emerald-800/50 backdrop-blur">
            <CardHeader>
                <CardTitle className="text-emerald-100 flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-emerald-400" /> Invest with Optimized Weights
                </CardTitle>
                <CardDescription>Use the optimized allocation to invest real dollars from your wallet</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {weights.length === 0 && (
                    <div className="flex items-center gap-3 p-4 rounded-lg bg-slate-800/60 border border-slate-700">
                        <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                        <p className="text-sm text-slate-400">Run <span className="text-amber-300 font-medium">Optimize Portfolio</span> first — weights needed before you can invest.</p>
                    </div>
                )}
                {weights.length > 0 && (<>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {tickerList.map((t, i) => (
                            <div key={t} className="rounded-lg bg-slate-800/50 p-2 text-center">
                                <span className="text-xs text-slate-400">{t}</span>
                                <p className="text-sm font-bold text-slate-100">
                                    {((weights[i] || 0) * 100).toFixed(1)}%
                                </p>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3">
                        <Input
                            type="number"
                            placeholder="Amount in USD"
                            value={investAmount}
                            onChange={(e) => onInvestAmountChange(e.target.value)}
                            className="bg-slate-800 border-slate-700 flex-1"
                            min="0"
                            step="0.01"
                        />
                        <LightBeamButton onClick={onInvest} disabled={investing} gradientColors={["#10b981", "#06b6d4", "#10b981"]}>
                            {investing ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                            Invest
                        </LightBeamButton>
                    </div>
                    {investAmount && parseFloat(investAmount) > 0 && (
                        <div className="rounded-lg bg-slate-800/30 p-3">
                            <p className="text-xs text-slate-400 mb-2">Allocation Preview:</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {tickerList.map((t, i) => {
                                    const alloc = parseFloat(investAmount) * (weights[i] || 0);
                                    return (
                                        <div key={t} className="text-xs">
                                            <span className="text-slate-400">{t}:</span>{" "}
                                            <span className="text-emerald-400 font-medium">${alloc.toFixed(2)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </>)}
            </CardContent>
        </Card>
    );
}
