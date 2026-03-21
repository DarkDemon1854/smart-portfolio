"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LightBeamButton } from "@/components/ui/light-beam-button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Wallet, ArrowUpCircle, ArrowDownCircle, DollarSign, TrendingUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ErrorBoundary } from "@/components/error-boundary";

export default function WalletPage() {
    const [cashCents, setCashCents] = useState(0);
    const [investedValueCents, setInvestedValueCents] = useState(0);
    const [totalEquityCents, setTotalEquityCents] = useState(0);
    const [ledger, setLedger] = useState<any[]>([]);
    const [depositAmount, setDepositAmount] = useState("");
    const [withdrawAmount, setWithdrawAmount] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [confirmWithdraw, setConfirmWithdraw] = useState(false);

    const fetchSummary = async () => {
        try {
            const res = await fetch("/api/wallet/summary");
            const data = await res.json();
            if (res.ok) {
                setCashCents(data.cashCents);
                setInvestedValueCents(data.investedValueCents);
                setTotalEquityCents(data.totalEquityCents);
                setLedger(data.ledger || []);
            }
        } catch { } finally {
            setFetching(false);
        }
    };

    useEffect(() => { fetchSummary(); }, []);

    const handleDeposit = async () => {
        const cents = Math.round(parseFloat(depositAmount) * 100);
        if (!cents || cents <= 0) { toast.error("Enter a valid deposit amount"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/wallet/deposit", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amountCents: cents }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Deposited $${(cents / 100).toFixed(2)}`);
            setDepositAmount("");
            fetchSummary();
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    };

    const executeWithdraw = async () => {
        const cents = Math.round(parseFloat(withdrawAmount) * 100);
        if (!cents || cents <= 0) { toast.error("Enter a valid withdrawal amount"); return; }
        setLoading(true);
        try {
            const res = await fetch("/api/wallet/withdraw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amountCents: cents }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            toast.success(`Withdrew $${(cents / 100).toFixed(2)}`);
            setWithdrawAmount("");
            fetchSummary();
        } catch (err: any) { toast.error(err.message); }
        finally { setLoading(false); }
    };

    const handleWithdraw = () => {
        const cents = Math.round(parseFloat(withdrawAmount) * 100);
        if (!cents || cents <= 0) { toast.error("Enter a valid withdrawal amount"); return; }
        setConfirmWithdraw(true);
    };

    const fmt = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="min-h-screen">
            <div className="container mx-auto p-6 space-y-6">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                    Wallet
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card glow className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/30 border-emerald-800 backdrop-blur">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-emerald-200 flex items-center gap-2">
                                <DollarSign className="h-4 w-4" /> Cash Balance
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-emerald-100">
                                {fetching ? "..." : fmt(cashCents)}
                            </span>
                        </CardContent>
                    </Card>

                    <Card glow className="bg-gradient-to-br from-blue-950/50 to-blue-900/30 border-blue-800 backdrop-blur">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-blue-200 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4" /> Invested Value
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-blue-100">
                                {fetching ? "..." : fmt(investedValueCents)}
                            </span>
                        </CardContent>
                    </Card>

                    <Card glow className="bg-gradient-to-br from-purple-950/50 to-purple-900/30 border-purple-800 backdrop-blur">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-sm font-medium text-purple-200 flex items-center gap-2">
                                <Wallet className="h-4 w-4" /> Total Equity
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <span className="text-2xl font-bold text-purple-100">
                                {fetching ? "..." : fmt(totalEquityCents)}
                            </span>
                        </CardContent>
                    </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-100 flex items-center gap-2">
                                <ArrowUpCircle className="h-5 w-5 text-emerald-400" /> Deposit
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input
                                type="number"
                                placeholder="Amount in USD"
                                value={depositAmount}
                                onChange={(e) => setDepositAmount(e.target.value)}
                                className="bg-slate-800 border-slate-700"
                                min="0"
                                step="0.01"
                            />
                            <LightBeamButton onClick={handleDeposit} disabled={loading} className="w-full" gradientColors={["#10b981", "#06b6d4", "#10b981"]}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Deposit
                            </LightBeamButton>
                        </CardContent>
                    </Card>

                    <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-100 flex items-center gap-2">
                                <ArrowDownCircle className="h-5 w-5 text-red-400" /> Withdraw
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Input
                                type="number"
                                placeholder="Amount in USD"
                                value={withdrawAmount}
                                onChange={(e) => setWithdrawAmount(e.target.value)}
                                className="bg-slate-800 border-slate-700"
                                min="0"
                                step="0.01"
                            />
                            <LightBeamButton onClick={handleWithdraw} disabled={loading} className="w-full" gradientColors={["#e11d48", "#f43f5e", "#e11d48"]}>
                                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Withdraw
                            </LightBeamButton>
                        </CardContent>
                    </Card>
                </div>

                <ErrorBoundary>
                    <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="text-slate-100">Recent Transactions</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {ledger.length === 0 ? (
                                <p className="text-slate-400 text-sm">No transactions yet.</p>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Type</TableHead>
                                            <TableHead>Amount</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Notes</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ledger.map((entry: any) => (
                                            <TableRow key={entry.id}>
                                                <TableCell>
                                                    <Badge variant={entry.amountCents >= 0 ? "default" : "destructive"}>
                                                        {entry.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className={entry.amountCents >= 0 ? "text-emerald-400" : "text-red-400"}>
                                                    {entry.amountCents >= 0 ? "+" : ""}{fmt(entry.amountCents)}
                                                </TableCell>
                                                <TableCell className="text-slate-400 text-sm">
                                                    {new Date(entry.createdAt).toLocaleDateString()}
                                                </TableCell>
                                                <TableCell className="text-slate-500 text-sm max-w-[200px] truncate">
                                                    {(() => { try { return JSON.parse(entry.metaJson)?.note || "-"; } catch { return "-"; } })()}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </ErrorBoundary>

                <ConfirmDialog
                    open={confirmWithdraw}
                    onClose={() => setConfirmWithdraw(false)}
                    onConfirm={executeWithdraw}
                    title="Confirm Withdrawal"
                    description={`Are you sure you want to withdraw $${(Math.round(parseFloat(withdrawAmount || "0") * 100) / 100).toFixed(2)} from your wallet? This action cannot be undone.`}
                    confirmText="Withdraw"
                    destructive
                />
            </div>
        </div>
    );
}
