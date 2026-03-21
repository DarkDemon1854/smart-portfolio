"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface BacktestStats {
    cagr: number;
    maxDrawdown: number;
    volatility: number;
    sharpe: number;
}

interface BacktestCardProps {
    backtestData: {
        dates: string[];
        portfolioValues: number[];
        equalPortfolioValues: number[];
        benchmarkValues: number[];
        stats: BacktestStats;
        equalStats: BacktestStats;
        benchmarkStats: BacktestStats;
    };
}

function StatBlock({ title, stats, color }: { title: string; stats: BacktestStats; color: string }) {
    return (
        <div className="space-y-2">
            <h4 className={`text-sm font-medium ${color}`}>{title}</h4>
            <div className="space-y-1 text-xs text-slate-300">
                <div>CAGR: {((stats.cagr || 0) * 100).toFixed(2)}%</div>
                <div>Max DD: {((stats.maxDrawdown || 0) * 100).toFixed(2)}%</div>
                <div>Vol: {((stats.volatility || 0) * 100).toFixed(2)}%</div>
                <div>Sharpe: {(stats.sharpe || 0).toFixed(3)}</div>
            </div>
        </div>
    );
}

export function BacktestCard({ backtestData }: BacktestCardProps) {
    const chartData = backtestData.dates.map((date: string, i: number) => ({
        date: date.slice(5),
        Optimized: backtestData.portfolioValues[i],
        EqualWeight: backtestData.equalPortfolioValues[i],
        Benchmark: backtestData.benchmarkValues[i],
    }));

    return (
        <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
            <CardHeader>
                <CardTitle className="text-slate-100">Backtest Results</CardTitle>
                <CardDescription>Portfolio performance on test data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="date" stroke="#94a3b8" />
                        <YAxis stroke="#94a3b8" />
                        <Tooltip contentStyle={{ backgroundColor: "#1e293b", border: "1px solid #334155" }} />
                        <Legend />
                        <Line type="monotone" dataKey="Optimized" stroke="#3b82f6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="EqualWeight" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="Benchmark" stroke="#10b981" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>

                <div className="grid grid-cols-3 gap-4">
                    <StatBlock title="Optimized Portfolio" stats={backtestData.stats} color="text-blue-300" />
                    <StatBlock title="Equal Weight" stats={backtestData.equalStats} color="text-purple-300" />
                    <StatBlock title="Benchmark" stats={backtestData.benchmarkStats} color="text-emerald-300" />
                </div>
            </CardContent>
        </Card>
    );
}
