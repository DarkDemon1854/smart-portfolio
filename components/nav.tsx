"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { TrendingUp, Wallet, PieChart, Clock, BarChart3, Menu, X } from "lucide-react";

const links = [
    { href: "/", label: "Dashboard", icon: TrendingUp },
    { href: "/wallet", label: "Wallet", icon: Wallet },
    { href: "/portfolio", label: "Portfolio", icon: PieChart },
    { href: "/history", label: "History", icon: Clock },
    { href: "/charts", label: "Charts", icon: BarChart3 },
];

export function Nav() {
    const pathname = usePathname();
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <nav className="sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl">
            <div className="container mx-auto flex items-center justify-between px-6 py-3">
                <div className="flex items-center gap-1">
                    <TrendingUp className="h-6 w-6 text-blue-400" />
                    <span className="text-lg font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                        SmartPortfolio
                    </span>
                </div>

                <div className="hidden md:flex items-center gap-1">
                    {links.map((link) => {
                        const active = pathname === link.href;
                        const Icon = link.icon;
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${active
                                    ? "bg-blue-600/20 text-blue-400"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                }`}
                            >
                                <Icon className="h-4 w-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                    <div className="ml-2 border-l border-slate-700 pl-2">
                        <ThemeToggle />
                    </div>
                </div>

                <button
                    className="md:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                    onClick={() => setMobileOpen(!mobileOpen)}
                >
                    {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {mobileOpen && (
                <div className="md:hidden border-t border-slate-800 bg-slate-950/95 backdrop-blur-xl">
                    <div className="container mx-auto px-6 py-3 space-y-1">
                        {links.map((link) => {
                            const active = pathname === link.href;
                            const Icon = link.icon;
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setMobileOpen(false)}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${active
                                        ? "bg-blue-600/20 text-blue-400"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                                    }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                        <div className="pt-2 border-t border-slate-800">
                            <ThemeToggle />
                        </div>
                    </div>
                </div>
            )}
        </nav>
    );
}
