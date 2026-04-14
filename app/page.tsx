"use client";

import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LightBeamButton } from "@/components/ui/light-beam-button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Loader2, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { CompanySelect } from "@/components/company-select";
import { Stepper } from "@/components/dashboard/stepper";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { AllocationCard } from "@/components/dashboard/allocation-card";
import { BacktestCard } from "@/components/dashboard/backtest-card";
import { InvestCard } from "@/components/dashboard/invest-card";
import { AutoTradeCard } from "@/components/dashboard/auto-trade-card";
import { RecommendationsCard } from "@/components/dashboard/recommendations-card";
import { ErrorBoundary } from "@/components/error-boundary";

interface TickerData {
    ticker: string;
    prices: any[];
}

export default function Dashboard() {
    const [tickers, setTickers] = useState("");
    const [startDate, setStartDate] = useState("2021-01-01");
    const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [model, setModel] = useState("rf");
    const [objective, setObjective] = useState("sharpe");
    const [maxWeight, setMaxWeight] = useState(0.4);
    const [riskFreeRate, setRiskFreeRate] = useState(0.0);
    const [lambda, setLambda] = useState(0.5);
    const [demoMode, setDemoMode] = useState(false);

    const [loading, setLoading] = useState(false);
    const [exportLoading, setExportLoading] = useState(false);
    const [error, setError] = useState("");
    const [tickersData, setTickersData] = useState<TickerData[]>([]);
    const [expectedReturns, setExpectedReturns] = useState<number[]>([]);
    const [mae, setMae] = useState(0);
    const [rmse, setRmse] = useState(0);
    const [weights, setWeights] = useState<number[]>([]);
    const [portfolioReturn, setPortfolioReturn] = useState(0);
    const [portfolioVolatility, setPortfolioVolatility] = useState(0);
    const [portfolioSharpe, setPortfolioSharpe] = useState(0);
    const [backtestData, setBacktestData] = useState<any>(null);
    const [predCache, setPredCache] = useState<{ tickers: string[]; predictions: Record<string, number>; expectedReturns: number[]; model: string; cachedAt: string } | null>(null);

    const [investAmount, setInvestAmount] = useState("");
    const [investing, setInvesting] = useState(false);
    const [autoAmount, setAutoAmount] = useState("");
    const [autoThreshold, setAutoThreshold] = useState("0");
    const [autoLoading, setAutoLoading] = useState(false);
    const [autoResult, setAutoResult] = useState<any>(null);
    const [autoCashoutResult, setAutoCashoutResult] = useState<any>(null);
    const [cycleAmount, setCycleAmount] = useState("");
    const [cycleLoading, setCycleLoading] = useState(false);
    const [cycleResult, setCycleResult] = useState<any>(null);
    const [autoCycleBudget, setAutoCycleBudget] = useState("");
    const [buyThreshold, setBuyThreshold] = useState("0.5");
    const [lastRunAt, setLastRunAt] = useState<Date | null>(null);

    const [cronSecret, setCronSecret] = useState("smart-trade-2026");
    const [cronLookback, setCronLookback] = useState("365");
    const [cronSaving, setCronSaving] = useState(false);
    const [cronLastRun, setCronLastRun] = useState<string | null>(null);
    const [cronWebhookHost, setCronWebhookHost] = useState("");

    const [stopLossPercent, setStopLossPercent] = useState("5");
    const [stopLossLoading, setStopLossLoading] = useState(false);
    const [stopLossResult, setStopLossResult] = useState<any>(null);

    const [recommendations, setRecommendations] = useState<{ ticker: string; name: string; predictedReturn: number }[]>([]);
    const [recoLoading, setRecoLoading] = useState(false);
    const [recoScanned, setRecoScanned] = useState<number | null>(null);
    const [recoTopN, setRecoTopN] = useState("5");

    const tickerList = tickers.split(",").map(t => t.trim()).filter(t => t);
    const tickerSaveRef = useRef<NodeJS.Timeout | null>(null);
    const tickerLoaded = useRef(false);

    useEffect(() => {
        fetch("/api/settings/tickers")
            .then(r => r.json())
            .then(data => {
                if (data.tickers) setTickers(data.tickers);
            })
            .catch(() => { })
            .finally(() => { tickerLoaded.current = true; });
        fetch("/api/predictions/cache")
            .then(r => r.json())
            .then(data => { if (data.cache) setPredCache(data.cache); })
            .catch(() => { });
    }, []);

    useEffect(() => {
        if (!tickerLoaded.current) return;
        if (tickerSaveRef.current) clearTimeout(tickerSaveRef.current);
        tickerSaveRef.current = setTimeout(() => {
            fetch("/api/settings/tickers", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickers }),
            }).catch(() => { });
        }, 800);
    }, [tickers]);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setCronWebhookHost(window.location.origin);
        }
        fetch("/api/cron/config")
            .then(r => r.json())
            .then(data => {
                if (data.config) {
                    if (data.config.amountCents) setAutoCycleBudget(String(data.config.amountCents / 100));
                    if (data.config.lookbackDays) setCronLookback(String(data.config.lookbackDays));
                    if (data.config.buyThreshold != null) setBuyThreshold(String(data.config.buyThreshold * 100));
                    if (data.config.stopLossPercent) setStopLossPercent(String(data.config.stopLossPercent));
                }
                if (data.secret) setCronSecret(data.secret);
                if (data.lastRun) setCronLastRun(data.lastRun);
            })
            .catch(() => { });
    }, []);

    const handleFetchData = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tickers: tickerList,
                    startDate,
                    endDate,
                    interval: "1d",
                    demoMode,
                }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Failed to fetch market data. Check your tickers and try again.");
            setTickersData(result.data);
            setError("");
            toast.success(`Loaded ${result.data.length} ticker(s) successfully`);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = async (format: "csv" | "xlsx") => {
        if (tickerList.length === 0) {
            toast.error("Add at least one ticker first");
            return;
        }

        setExportLoading(true);
        try {
            const response = await fetch("/api/data/export", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tickers: tickerList,
                    startDate,
                    endDate,
                    format,
                    demoMode,
                }),
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.error || "Export failed");
            }

            const blob = await response.blob();
            const disposition = response.headers.get("Content-Disposition") || "";
            const match = disposition.match(/filename=\"?([^\"]+)\"?/i);
            const fileName = match?.[1] || `yahoo-data.${format}`;

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);

            toast.success(`Downloaded ${fileName}`);
        } catch (err: any) {
            toast.error(err.message || "Export failed");
        } finally {
            setExportLoading(false);
        }
    };

    const handleTrainModel = async () => {
        if (tickersData.length === 0) {
            setError("Please fetch data first");
            toast.error("Fetch data before training");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/train", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData, model, fastMode: true }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Model training failed. Try different parameters or more data.");
            setExpectedReturns(result.expectedReturns);
            setMae(result.mae);
            setRmse(result.rmse);
            setError("");
            toast.success(`${model.toUpperCase()} model trained — MAE: ${(result.mae * 100).toFixed(4)}%`);
            fetch("/api/predictions/cache")
                .then(r => r.json())
                .then(data => { if (data.cache) setPredCache(data.cache); })
                .catch(() => { });
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleOptimize = async () => {
        if (expectedReturns.length === 0) {
            setError("Please train model first");
            toast.error("Train a model before optimizing");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData, expectedReturns, maxWeight, riskFreeRate, lambda, objective }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Optimization failed. Try adjusting constraints.");
            setWeights(result.weights);
            setPortfolioReturn(result.expectedReturn);
            setPortfolioVolatility(result.volatility);
            setPortfolioSharpe(result.sharpe);
            setError("");
            toast.success(`Portfolio optimized — Sharpe: ${result.sharpe.toFixed(3)}`);
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleBacktest = async () => {
        if (weights.length === 0) {
            setError("Please optimize portfolio first");
            toast.error("Optimize before backtesting");
            return;
        }
        setLoading(true);
        setError("");
        try {
            const response = await fetch("/api/backtest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData, weights, startCapital: 10000 }),
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || "Backtest failed. Ensure sufficient data.");
            setBacktestData(result);
            setError("");
            toast.success("Backtest complete");
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const runCycleWithBudget = async (budgetCents: number, silent = false) => {
        setCycleLoading(true);
        if (!silent) setCycleResult(null);
        try {
            const res = await fetch("/api/auto-trade", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tickersData, model, fastMode: true,
                    maxWeight, riskFreeRate, lambda, objective,
                    amountCents: budgetCents,
                    sellThreshold: 0,
                    buyThreshold: (parseFloat(buyThreshold) || 0.5) / 100,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setCycleResult(data);
            setLastRunAt(new Date());
            if (data.weights) {
                setWeights(data.weights);
                setPortfolioReturn(data.portfolioReturn);
                setPortfolioVolatility(data.portfolioVolatility);
                setPortfolioSharpe(data.portfolioSharpe);
            }
            const sold = data.soldTickers?.length ?? 0;
            const bought = data.boughtTickers?.length ?? 0;
            if (sold > 0 || bought > 0) {
                toast.success(`${silent ? "Auto-cycle" : "Cycle"} done — sold ${sold} losers, bought ${bought} winners`);
            } else {
                toast.info(data.message || "Cycle ran, no trades needed");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setCycleLoading(false);
        }
    };

    const handleSmartCycle = async () => {
        if (tickersData.length === 0) { toast.error("Fetch data first"); return; }
        const cents = Math.round(parseFloat(cycleAmount) * 100);
        if (!cents || cents <= 0) { toast.error("Enter a valid budget amount"); return; }
        await runCycleWithBudget(cents, false);
        setCycleAmount("");
    };

    const handleSaveCronConfig = async () => {
        if (!cronSecret || cronSecret.length < 8) {
            toast.error("Secret must be at least 8 characters");
            return;
        }
        if (tickerList.length === 0) {
            toast.error("Add tickers first (top of page)");
            return;
        }
        setCronSaving(true);
        try {
            const amountCents = Math.round(parseFloat(autoCycleBudget) * 100);
            if (!amountCents || amountCents <= 0) { toast.error("Set a cycle budget first"); setCronSaving(false); return; }
            const res = await fetch("/api/cron/config", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tickers: tickerList, model, maxWeight, riskFreeRate, lambda, objective,
                    amountCents, lookbackDays: parseInt(cronLookback) || 365,
                    buyThreshold: (parseFloat(buyThreshold) || 0.5) / 100,
                    stopLossPercent: parseFloat(stopLossPercent) || 0,
                    secret: cronSecret,
                }),
            });
            const data = await res.json();
            if (res.ok) {
                toast.success("Cron config saved! Copy the webhook URL below.");
            } else {
                toast.error(data.error || "Failed to save config");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setCronSaving(false);
        }
    };

    const handleAutoBuy = async () => {
        if (tickersData.length === 0) { toast.error("Fetch data first"); return; }
        const cents = Math.round(parseFloat(autoAmount) * 100);
        if (!cents || cents <= 0) { toast.error("Enter a valid investment amount"); return; }
        setAutoLoading(true);
        setAutoResult(null);
        try {
            const res = await fetch("/api/auto-invest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData, model, fastMode: true, maxWeight, riskFreeRate, lambda, objective, amountCents: cents }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAutoResult(data);
            setWeights(data.weights);
            setExpectedReturns(data.expectedReturns);
            setPortfolioReturn(data.portfolioReturn);
            setPortfolioVolatility(data.portfolioVolatility);
            setPortfolioSharpe(data.portfolioSharpe);
            toast.success(`Auto-invested $${(data.totalInvestedCents / 100).toFixed(2)} with AI-optimized weights!`);
            setAutoAmount("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setAutoLoading(false);
        }
    };

    const handleAutoSell = async () => {
        if (tickersData.length === 0) { toast.error("Fetch data first"); return; }
        setAutoLoading(true);
        setAutoCashoutResult(null);
        try {
            const res = await fetch("/api/auto-cashout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData, model, fastMode: true, sellThreshold: parseFloat(autoThreshold) / 100 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAutoCashoutResult(data);
            if (data.soldTickers?.length > 0) {
                toast.success(`Auto-sold ${data.soldTickers.length} position(s) for $${(data.totalProceedsCents / 100).toFixed(2)}`);
            } else {
                toast.info(data.message || "No positions sold");
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setAutoLoading(false);
        }
    };

    const handleStopLossCheck = async () => {
        const pct = parseFloat(stopLossPercent);
        if (!pct || pct <= 0) { toast.error("Set a valid stop-loss percentage"); return; }
        setStopLossLoading(true);
        setStopLossResult(null);
        try {
            const res = await fetch("/api/stop-loss", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stopLossPercent: pct }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setStopLossResult(data);
            if (data.soldTickers?.length > 0) {
                toast.success(`Stop-loss sold ${data.soldTickers.length} position(s)`);
            } else {
                toast.info(data.message);
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setStopLossLoading(false);
        }
    };

    const handleRecommend = async () => {
        setRecoLoading(true);
        setRecommendations([]);
        setRecoScanned(null);
        try {
            const res = await fetch("/api/recommend", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ selectedTickers: tickerList, model, topN: parseInt(recoTopN) || 5, lookbackDays: 1095, scanCount: 40 }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setRecommendations(data.recommendations);
            setRecoScanned(data.scanned);
            if (data.recommendations.length === 0) {
                toast.info("No strong buy signals found in the scanned universe right now.");
            } else {
                toast.success(`Found ${data.recommendations.length} opportunit${data.recommendations.length > 1 ? "ies" : "y"} from ${data.scanned} scanned tickers!`);
            }
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setRecoLoading(false);
        }
    };

    const handleInvest = async () => {
        if (!weights || weights.length === 0) { toast.error("Run optimization first to get weights"); return; }
        const cents = Math.round(parseFloat(investAmount) * 100);
        if (!cents || cents <= 0) { toast.error("Enter a valid investment amount"); return; }
        setInvesting(true);
        try {
            const res = await fetch("/api/invest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amountCents: cents, tickers: tickerList, weights }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Invested $${(cents / 100).toFixed(2)} across ${tickerList.length} tickers!`);
            setInvestAmount("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setInvesting(false);
        }
    };

    const [runningStep, setRunningStep] = useState("");

    const handleOptimizeAll = async () => {
        if (tickerList.length === 0) {
            toast.error("Add at least one ticker first");
            return;
        }
        setLoading(true);
        setError("");
        setRunningStep("Fetching market data...");
        try {
            const dataRes = await fetch("/api/data", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickers: tickerList, startDate, endDate, interval: "1d", demoMode }),
            });
            const dataResult = await dataRes.json();
            if (!dataRes.ok) throw new Error(dataResult.error || "Failed to fetch market data. Check your tickers and try again.");
            setTickersData(dataResult.data);

            setRunningStep("Training AI model...");
            const trainRes = await fetch("/api/train", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData: dataResult.data, model, fastMode: true }),
            });
            const trainResult = await trainRes.json();
            if (!trainRes.ok) throw new Error(trainResult.error || "Model training failed. Try different parameters or more data.");
            setExpectedReturns(trainResult.expectedReturns);
            setMae(trainResult.mae);
            setRmse(trainResult.rmse);

            setRunningStep("Optimizing weights...");
            const optRes = await fetch("/api/optimize", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData: dataResult.data, expectedReturns: trainResult.expectedReturns, maxWeight, riskFreeRate, lambda, objective }),
            });
            const optResult = await optRes.json();
            if (!optRes.ok) throw new Error(optResult.error || "Optimization failed. Try adjusting constraints.");
            setWeights(optResult.weights);
            setPortfolioReturn(optResult.expectedReturn);
            setPortfolioVolatility(optResult.volatility);
            setPortfolioSharpe(optResult.sharpe);

            setRunningStep("Running backtest...");
            const btRes = await fetch("/api/backtest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ tickersData: dataResult.data, weights: optResult.weights, startCapital: 10000 }),
            });
            const btResult = await btRes.json();
            if (!btRes.ok) throw new Error(btResult.error || "Backtest failed. Ensure sufficient data.");
            setBacktestData(btResult);

            setRunningStep("");
            setError("");
            toast.success(`Portfolio optimized — Sharpe: ${optResult.sharpe.toFixed(3)}`);
            fetch("/api/predictions/cache")
                .then(r => r.json())
                .then(data => { if (data.cache) setPredCache(data.cache); })
                .catch(() => { });
        } catch (err: any) {
            setError(err.message);
            toast.error(err.message);
            setRunningStep("");
        } finally {
            setLoading(false);
        }
    };

    const steps = [
        { label: "Fetch Data", complete: tickersData.length > 0, active: runningStep === "Fetching market data..." },
        { label: "Train Model", complete: expectedReturns.length > 0, active: runningStep === "Training AI model..." },
        { label: "Optimize", complete: weights.length > 0, active: runningStep === "Optimizing weights..." },
        { label: "Backtest", complete: !!backtestData, active: runningStep === "Running backtest..." },
    ];

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-6 space-y-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                            Smart Portfolio Optimizer
                        </h1>
                        <p className="text-slate-400 mt-2">AI-powered financial portfolio optimization with advanced analytics</p>
                    </div>
                    <Stepper steps={steps} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    <Card glow className="lg:col-span-1 bg-slate-900/50 border-slate-800 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-100">Configuration</CardTitle>
                            <CardDescription>Set your portfolio parameters</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Select Companies</label>
                                <CompanySelect
                                    value=""
                                    onChange={() => { }}
                                    mode="multi"
                                    placeholder="Click to search & add companies..."
                                    selectedTickers={tickerList}
                                    onAddTicker={(symbol) => {
                                        if (!tickerList.includes(symbol)) {
                                            setTickers(tickerList.length > 0 ? tickerList.join(",") + "," + symbol : symbol);
                                        }
                                    }}
                                    onRemoveTicker={(symbol) => {
                                        setTickers(tickerList.filter(t => t !== symbol).join(","));
                                    }}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">Start Date</label>
                                    <Input type="text" value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="YYYY-MM-DD" className="bg-slate-800 border-slate-700 max-w-[150px]" />
                                </div>
                                <div>
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">End Date</label>
                                    <Input type="text" value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="YYYY-MM-DD" className="bg-slate-800 border-slate-700 max-w-[150px]" />
                                </div>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Model</label>
                                <Select value={model} onChange={(e) => setModel(e.target.value)} className="bg-slate-800 border-slate-700">
                                    <option value="rf">Random Forest</option>
                                    <option value="boosting">Gradient Boosting</option>
                                    <option value="cnn">1D CNN</option>
                                    <option value="ensemble">Ensemble (RF + GB)</option>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Objective</label>
                                <Select value={objective} onChange={(e) => setObjective(e.target.value)} className="bg-slate-800 border-slate-700">
                                    <option value="sharpe">Max Sharpe</option>
                                    <option value="minVol">Min Volatility</option>
                                    <option value="maxReturn">Max Return - &lambda; x Vol</option>
                                </Select>
                            </div>

                            <div title="Maximum allocation per asset. Lower values force diversification.">
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Max Weight: {maxWeight.toFixed(2)}</label>
                                <Slider value={maxWeight} onValueChange={setMaxWeight} min={0.1} max={1.0} step={0.05} />
                            </div>

                            <div title="Annual risk-free rate used in Sharpe ratio calculation.">
                                <label className="text-sm font-medium text-slate-300 mb-2 block">Risk-Free Rate: {riskFreeRate.toFixed(3)}</label>
                                <Slider value={riskFreeRate} onValueChange={setRiskFreeRate} min={0} max={0.1} step={0.001} />
                            </div>

                            {objective === "maxReturn" && (
                                <div title="Risk aversion parameter. Higher values penalize volatility more.">
                                    <label className="text-sm font-medium text-slate-300 mb-2 block">Lambda: {lambda.toFixed(2)}</label>
                                    <Slider value={lambda} onValueChange={setLambda} min={0} max={2} step={0.1} />
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <input type="checkbox" id="demoMode" checked={demoMode} onChange={(e) => setDemoMode(e.target.checked)} className="w-4 h-4" />
                                <label htmlFor="demoMode" className="text-sm font-medium text-slate-300">Demo Mode</label>
                            </div>

                            <Separator className="bg-slate-700" />

                            {predCache && (
                                <div className="p-3 rounded-lg bg-indigo-950/50 border border-indigo-700/50 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <p className="text-xs font-medium text-indigo-300">Cached Predictions</p>
                                        <span className="text-[10px] text-indigo-400 bg-indigo-900/50 px-2 py-0.5 rounded-full">{predCache.model.toUpperCase()}</span>
                                    </div>
                                    <p className="text-[10px] text-slate-500">From cron · {new Date(predCache.cachedAt).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400">Tickers: {predCache.tickers.join(", ")}</p>
                                    <LightBeamButton
                                        className="w-full text-xs py-2"
                                        gradientColors={["#6366f1", "#818cf8", "#6366f1"]}
                                        onClick={() => {
                                            const currentList = tickers.split(",").map(t => t.trim()).filter(t => t);
                                            const returns = currentList.map(t => predCache.predictions[t] ?? 0);
                                            setExpectedReturns(returns);
                                            setMae(0);
                                            setRmse(0);
                                            toast.success("Cached predictions loaded — click Optimize Portfolio!");
                                        }}
                                    >
                                        Use Cached - Skip Training
                                    </LightBeamButton>
                                </div>
                            )}

                            <LightBeamButton
                                onClick={handleOptimizeAll}
                                disabled={loading || tickerList.length === 0}
                                className="w-full py-3 text-base font-semibold"
                                gradientColors={["#3b82f6", "#a855f7", "#3b82f6"]}
                            >
                                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                                {loading ? runningStep : "Optimize Portfolio"}
                            </LightBeamButton>

                            <div className="grid grid-cols-2 gap-2">
                                <LightBeamButton
                                    onClick={() => handleExportData("csv")}
                                    disabled={loading || exportLoading || tickerList.length === 0}
                                    className="w-full py-2 text-sm font-semibold"
                                    gradientColors={["#3b82f6", "#a855f7", "#3b82f6"]}
                                >
                                    {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Export CSV
                                </LightBeamButton>

                                <LightBeamButton
                                    onClick={() => handleExportData("xlsx")}
                                    disabled={loading || exportLoading || tickerList.length === 0}
                                    className="w-full py-2 text-sm font-semibold"
                                    gradientColors={["#3b82f6", "#a855f7", "#3b82f6"]}
                                >
                                    {exportLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                    Export Excel
                                </LightBeamButton>
                            </div>

                            {error && (
                                <div className="flex items-start space-x-2 p-3 bg-red-950/50 border border-red-800 rounded-md">
                                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                                    <p className="text-sm text-red-300">{error}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="lg:col-span-3 space-y-6">
                        <ErrorBoundary>
                            <StatsCards
                                portfolioReturn={portfolioReturn}
                                portfolioVolatility={portfolioVolatility}
                                portfolioSharpe={portfolioSharpe}
                                mae={mae}
                                rmse={rmse}
                            />
                        </ErrorBoundary>

                        {weights.length > 0 && (
                            <ErrorBoundary>
                                <AllocationCard
                                    weights={weights}
                                    tickers={tickersData.map(td => td.ticker)}
                                    expectedReturns={expectedReturns}
                                />
                            </ErrorBoundary>
                        )}

                        {backtestData && (
                            <ErrorBoundary>
                                <BacktestCard backtestData={backtestData} />
                            </ErrorBoundary>
                        )}

                        <ErrorBoundary>
                            <InvestCard
                                weights={weights}
                                tickerList={tickerList}
                                investAmount={investAmount}
                                investing={investing}
                                onInvestAmountChange={setInvestAmount}
                                onInvest={handleInvest}
                            />
                        </ErrorBoundary>

                        {tickersData.length > 0 && (
                            <ErrorBoundary>
                                <AutoTradeCard
                                    model={model}
                                    maxWeight={maxWeight}
                                    objective={objective}
                                    buyThreshold={buyThreshold}
                                    autoCycleBudget={autoCycleBudget}
                                    cycleAmount={cycleAmount}
                                    cycleLoading={cycleLoading}
                                    cycleResult={cycleResult}
                                    lastRunAt={lastRunAt}
                                    autoAmount={autoAmount}
                                    autoLoading={autoLoading}
                                    autoResult={autoResult}
                                    autoCashoutResult={autoCashoutResult}
                                    autoThreshold={autoThreshold}
                                    cronSecret={cronSecret}
                                    cronLookback={cronLookback}
                                    cronSaving={cronSaving}
                                    cronWebhookHost={cronWebhookHost}
                                    cronLastRun={cronLastRun}
                                    setBuyThreshold={setBuyThreshold}
                                    setAutoCycleBudget={setAutoCycleBudget}
                                    setCycleAmount={setCycleAmount}
                                    setAutoAmount={setAutoAmount}
                                    setAutoThreshold={setAutoThreshold}
                                    setCronSecret={setCronSecret}
                                    setCronLookback={setCronLookback}
                                    stopLossPercent={stopLossPercent}
                                    stopLossLoading={stopLossLoading}
                                    stopLossResult={stopLossResult}
                                    setStopLossPercent={setStopLossPercent}
                                    onSmartCycle={handleSmartCycle}
                                    onSaveCronConfig={handleSaveCronConfig}
                                    onAutoBuy={handleAutoBuy}
                                    onAutoSell={handleAutoSell}
                                    onStopLossCheck={handleStopLossCheck}
                                />
                            </ErrorBoundary>
                        )}

                        <ErrorBoundary>
                            <RecommendationsCard
                                model={model}
                                recommendations={recommendations}
                                recoLoading={recoLoading}
                                recoScanned={recoScanned}
                                recoTopN={recoTopN}
                                tickers={tickers}
                                setRecoTopN={setRecoTopN}
                                setTickers={setTickers}
                                onRecommend={handleRecommend}
                            />
                        </ErrorBoundary>
                    </div>
                </div>
            </div>
        </div>
    );
}
