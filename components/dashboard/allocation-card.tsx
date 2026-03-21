"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

interface AllocationCardProps {
    weights: number[];
    tickers: string[];
    expectedReturns: number[];
}

const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4", "#f43f5e", "#a855f7"];

export function AllocationCard({ weights, tickers, expectedReturns }: AllocationCardProps) {
    const pieData = weights.map((w, i) => ({
        name: tickers[i] || `Asset ${i + 1}`,
        value: w * 100,
    }));

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-slate-100">Portfolio Allocation</CardTitle>
                </CardHeader>
                <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, value }) => `${name}: ${value.toFixed(1)}%`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                            >
                                {pieData.map((_, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                        </PieChart>
                    </ResponsiveContainer>
                </CardContent>
            </Card>

            <Card glow className="bg-slate-900/50 border-slate-800 backdrop-blur">
                <CardHeader>
                    <CardTitle className="text-slate-100">Optimal Weights</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Ticker</TableHead>
                                <TableHead>Weight</TableHead>
                                <TableHead>Expected Return</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {weights.map((w, i) => (
                                <TableRow key={i}>
                                    <TableCell className="font-medium">{tickers[i]}</TableCell>
                                    <TableCell>
                                        <Badge variant="outline">{(w * 100).toFixed(2)}%</Badge>
                                    </TableCell>
                                    <TableCell className={expectedReturns[i] >= 0 ? "text-green-400" : "text-red-400"}>
                                        {(expectedReturns[i] * 100).toFixed(3)}%
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
