"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, BarChart3 } from "lucide-react";

interface StatsCardsProps {
    portfolioReturn: number;
    portfolioVolatility: number;
    portfolioSharpe: number;
    mae: number;
    rmse: number;
}

export function StatsCards({ portfolioReturn, portfolioVolatility, portfolioSharpe, mae, rmse }: StatsCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card glow className="bg-gradient-to-br from-blue-950/50 to-blue-900/30 border-blue-800 backdrop-blur">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-200">Expected Return</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-blue-400" />
                        <span className="text-2xl font-bold text-blue-100">
                            {(portfolioReturn * 100).toFixed(2)}%
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card glow className="bg-gradient-to-br from-purple-950/50 to-purple-900/30 border-purple-800 backdrop-blur">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-purple-200">Volatility</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <BarChart3 className="h-5 w-5 text-purple-400" />
                        <span className="text-2xl font-bold text-purple-100">
                            {(portfolioVolatility * 100).toFixed(2)}%
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card glow className="bg-gradient-to-br from-emerald-950/50 to-emerald-900/30 border-emerald-800 backdrop-blur">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-emerald-200">Sharpe Ratio</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="h-5 w-5 text-emerald-400" />
                        <span className="text-2xl font-bold text-emerald-100">
                            {portfolioSharpe.toFixed(3)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card glow className="bg-gradient-to-br from-amber-950/50 to-amber-900/30 border-amber-800 backdrop-blur">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-amber-200">Model Error</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-1">
                        <div className="text-xs text-amber-300">MAE: {(mae * 100).toFixed(4)}%</div>
                        <div className="text-xs text-amber-300">RMSE: {(rmse * 100).toFixed(4)}%</div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
