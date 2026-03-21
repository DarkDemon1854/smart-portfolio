"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, PlusCircle, Loader2 } from "lucide-react";
import { LightBeamButton } from "@/components/ui/light-beam-button";
import { toast } from "sonner";

interface Recommendation {
    ticker: string;
    name: string;
    predictedReturn: number;
}

interface RecommendationsCardProps {
    model: string;
    recommendations: Recommendation[];
    recoLoading: boolean;
    recoScanned: number | null;
    recoTopN: string;
    tickers: string;
    setRecoTopN: (v: string) => void;
    setTickers: (v: string) => void;
    onRecommend: () => void;
}

export function RecommendationsCard(props: RecommendationsCardProps) {
    return (
        <Card glow className="bg-gradient-to-br from-sky-950/40 to-indigo-950/40 border-sky-800/50 backdrop-blur">
            <CardHeader>
                <CardTitle className="text-sky-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-sky-400" /> Smart Recommendations
                </CardTitle>
                <CardDescription>AI scans 40+ tickers outside your portfolio and surfaces the best predicted opportunities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-end gap-3">
                    <div className="flex flex-col gap-1">
                        <label className="text-xs text-slate-400">Top N results</label>
                        <Input
                            type="number"
                            value={props.recoTopN}
                            onChange={(e) => props.setRecoTopN(e.target.value)}
                            className="bg-slate-800 border-slate-700 w-20"
                            min="1" max="20" step="1"
                        />
                    </div>
                    <LightBeamButton
                        onClick={props.onRecommend}
                        disabled={props.recoLoading}
                        gradientColors={["#0284c7", "#06b6d4", "#0284c7"]}
                    >
                        {props.recoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                        {props.recoLoading ? "Scanning..." : "Scan for Opportunities"}
                    </LightBeamButton>
                    {props.recoScanned !== null && !props.recoLoading && (
                        <span className="text-xs text-slate-500">Scanned {props.recoScanned} tickers · Model: {props.model}</span>
                    )}
                </div>

                {props.recoLoading && (
                    <div className="flex items-center gap-2 text-xs text-slate-400 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
                        Fetching data and running predictions — this takes ~15-30s...
                    </div>
                )}

                {props.recommendations.length > 0 && (
                    <div className="space-y-2">
                        {props.recommendations.map((r, i) => (
                            <div key={r.ticker} className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-sky-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-500 font-mono w-4">#{i + 1}</span>
                                    <div>
                                        <span className="font-bold text-slate-100 text-sm">{r.ticker}</span>
                                        <p className="text-[11px] text-slate-400">{r.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-xs text-slate-400">Predicted return</p>
                                        <p className="text-sm font-bold text-emerald-400">+{(r.predictedReturn * 100).toFixed(3)}%</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-sky-700 text-sky-300 hover:bg-sky-800/40 text-xs"
                                        onClick={() => {
                                            const current = props.tickers.split(",").map(t => t.trim()).filter(t => t);
                                            if (!current.includes(r.ticker)) {
                                                props.setTickers(current.length > 0 ? current.join(",") + "," + r.ticker : r.ticker);
                                                toast.success(`${r.ticker} added to your ticker list`);
                                            } else {
                                                toast.info(`${r.ticker} is already in your list`);
                                            }
                                        }}
                                    >
                                        <PlusCircle className="h-3 w-3 mr-1" /> Add
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {props.recommendations.length === 0 && props.recoScanned !== null && !props.recoLoading && (
                    <p className="text-xs text-slate-500 py-2">No tickers cleared the buy threshold in this scan. Try lowering the Min buy signal % or scanning again later.</p>
                )}
            </CardContent>
        </Card>
    );
}
