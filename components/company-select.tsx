"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { STOCK_LIST, StockEntry } from "@/lib/stocks";
import { Search, ChevronDown, X, Check } from "lucide-react";

interface CompanySelectProps {
    value: string;
    onChange: (symbol: string) => void;
    placeholder?: string;
    /** "single" = pick one ticker (Charts), "multi" = add multiple (Dashboard) */
    mode?: "single" | "multi";
    selectedTickers?: string[];
    onAddTicker?: (symbol: string) => void;
    onRemoveTicker?: (symbol: string) => void;
}

export function CompanySelect({
    value,
    onChange,
    placeholder = "Select a company...",
    mode = "single",
    selectedTickers = [],
    onAddTicker,
    onRemoveTicker,
}: CompanySelectProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [yahooResults, setYahooResults] = useState<StockEntry[]>([]);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
    const triggerRef = useRef<HTMLButtonElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Close on outside click
    useEffect(() => {
        function handleClick(e: MouseEvent) {
            const target = e.target as Node;
            if (
                triggerRef.current && !triggerRef.current.contains(target) &&
                dropdownRef.current && !dropdownRef.current.contains(target)
            ) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    // Position the portal dropdown under the trigger button
    useEffect(() => {
        if (open && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            setDropdownPos({
                top: rect.bottom + window.scrollY + 4,
                left: rect.left + window.scrollX,
                width: rect.width,
            });
        }
    }, [open]);

    // Reposition on scroll/resize while open
    useEffect(() => {
        if (!open) return;
        const reposition = () => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                setDropdownPos({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX,
                    width: rect.width,
                });
            }
        };
        window.addEventListener("scroll", reposition, true);
        window.addEventListener("resize", reposition);
        return () => {
            window.removeEventListener("scroll", reposition, true);
            window.removeEventListener("resize", reposition);
        };
    }, [open]);

    // Filter the 300+ built-in list
    const filtered = useMemo(() => {
        if (!search.trim()) return STOCK_LIST;
        const q = search.toLowerCase();
        return STOCK_LIST.filter(
            (s) => s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
        );
    }, [search]);

    // Also search Yahoo for anything not in our list
    useEffect(() => {
        if (search.length < 2) {
            setYahooResults([]);
            return;
        }
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(async () => {
            try {
                const res = await fetch(`/api/search?q=${encodeURIComponent(search)}`);
                const data = await res.json();
                if (data.results) {
                    const builtInSymbols = new Set(STOCK_LIST.map((s) => s.symbol));
                    const extra = data.results
                        .filter((r: any) => !builtInSymbols.has(r.symbol))
                        .map((r: any) => ({ symbol: r.symbol, name: r.name }));
                    setYahooResults(extra);
                }
            } catch { }
        }, 400);
    }, [search]);

    const currentEntry = STOCK_LIST.find((s) => s.symbol === value);
    const displayText = currentEntry ? `${currentEntry.symbol} — ${currentEntry.name}` : value || placeholder;

    const handleSelect = (symbol: string) => {
        if (mode === "single") {
            onChange(symbol);
            setOpen(false);
            setSearch("");
        } else {
            onAddTicker?.(symbol);
        }
    };

    const dropdownContent = open ? (
        <div
            ref={dropdownRef}
            style={{
                position: "absolute",
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
                zIndex: 9999,
            }}
            className="rounded-lg border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden"
        >
            {/* Search input */}
            <div className="p-2 border-b border-slate-800">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                    <input
                        ref={inputRef}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name or symbol..."
                        className="w-full rounded-md border border-slate-700 bg-slate-800 py-1.5 pl-8 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Results list */}
            <div className="max-h-64 overflow-y-auto">
                {filtered.length === 0 && yahooResults.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm text-slate-500">
                        No companies found for &quot;{search}&quot;
                    </div>
                ) : (
                    <>
                        {filtered.length > 0 && (
                            <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-800/50 sticky top-0">
                                {search ? `${filtered.length} matches` : `All Companies (${STOCK_LIST.length})`}
                            </div>
                        )}
                        {filtered.map((s) => {
                            const isActive = mode === "single" ? value === s.symbol : selectedTickers.includes(s.symbol);
                            return (
                                <button
                                    key={s.symbol}
                                    onClick={() => handleSelect(s.symbol)}
                                    disabled={mode === "multi" && isActive}
                                    className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isActive
                                        ? "bg-blue-600/10 text-blue-300"
                                        : "text-slate-200 hover:bg-slate-800"
                                        } ${mode === "multi" && isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="font-semibold text-slate-100 w-16 flex-shrink-0">{s.symbol}</span>
                                        <span className="text-slate-400 truncate text-xs">{s.name}</span>
                                    </div>
                                    {isActive && <Check className="h-3.5 w-3.5 text-blue-400" />}
                                </button>
                            );
                        })}

                        {yahooResults.length > 0 && (
                            <>
                                <div className="px-3 py-1.5 text-[10px] font-semibold text-emerald-500 uppercase tracking-wider bg-slate-800/50 sticky top-0">
                                    Yahoo Finance Results ({yahooResults.length})
                                </div>
                                {yahooResults.map((s) => {
                                    const isActive = mode === "multi" && selectedTickers.includes(s.symbol);
                                    return (
                                        <button
                                            key={"yf-" + s.symbol}
                                            onClick={() => handleSelect(s.symbol)}
                                            disabled={isActive}
                                            className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors ${isActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                                                } text-slate-200 hover:bg-slate-800`}
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-semibold text-emerald-300 w-16 flex-shrink-0">{s.symbol}</span>
                                                <span className="text-slate-400 truncate text-xs">{s.name}</span>
                                            </div>
                                            {isActive && <Check className="h-3.5 w-3.5 text-blue-400" />}
                                        </button>
                                    );
                                })}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Footer count */}
            <div className="border-t border-slate-800 px-3 py-1.5 text-[10px] text-slate-600 text-center">
                {STOCK_LIST.length} built-in companies • Type to search Yahoo Finance for more
            </div>
        </div>
    ) : null;

    return (
        <div className="relative w-full">
            {/* Trigger Button */}
            <button
                ref={triggerRef}
                type="button"
                onClick={() => {
                    setOpen(!open);
                    if (!open) setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors ${open
                    ? "border-blue-500 bg-slate-800 ring-1 ring-blue-500/30"
                    : "border-slate-700 bg-slate-800 hover:border-slate-600"
                    }`}
            >
                <span className={value ? "text-slate-100" : "text-slate-500"}>
                    {mode === "single" ? displayText : placeholder}
                </span>
                <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            {/* Multi-mode chips */}
            {mode === "multi" && selectedTickers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedTickers.map((t) => {
                        const entry = STOCK_LIST.find((s) => s.symbol === t);
                        return (
                            <span
                                key={t}
                                className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-medium text-blue-300"
                            >
                                {t}
                                {entry && <span className="text-blue-500/60 hidden sm:inline">({entry.name.slice(0, 15)})</span>}
                                <button onClick={() => onRemoveTicker?.(t)} className="hover:text-red-400 transition-colors ml-0.5">
                                    <X className="h-3 w-3" />
                                </button>
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Portal dropdown — renders on document.body to avoid backdrop-blur clipping */}
            {typeof window !== "undefined" && createPortal(dropdownContent, document.body)}
        </div>
    );
}
