"use client";

import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Loader2, X } from "lucide-react";

interface StockResult {
    symbol: string;
    name: string;
    type: string;
    exchange: string;
}

interface StockSearchProps {
    onAdd: (symbol: string) => void;
    selectedTickers?: string[];
    placeholder?: string;
}

export function StockSearch({ onAdd, selectedTickers = [], placeholder = "Search any company or ticker..." }: StockSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<StockResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const search = async (q: string) => {
        if (q.length < 1) {
            setResults([]);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
            const data = await res.json();
            if (res.ok) {
                setResults(data.results || []);
                setOpen(true);
            }
        } catch { } finally {
            setLoading(false);
        }
    };

    const handleChange = (value: string) => {
        setQuery(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(value), 300);
    };

    const handleSelect = (symbol: string) => {
        onAdd(symbol);
        setQuery("");
        setResults([]);
        setOpen(false);
    };

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                    value={query}
                    onChange={(e) => handleChange(e.target.value)}
                    onFocus={() => { if (results.length > 0) setOpen(true); }}
                    placeholder={placeholder}
                    className="bg-slate-800 border-slate-700 pl-10 pr-8"
                />
                {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-blue-400 animate-spin" />}
            </div>

            {open && results.length > 0 && (
                <div className="absolute z-50 mt-1 w-full max-h-72 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
                    {results.map((r) => {
                        const isSelected = selectedTickers.includes(r.symbol);
                        return (
                            <button
                                key={r.symbol}
                                onClick={() => !isSelected && handleSelect(r.symbol)}
                                disabled={isSelected}
                                className={`flex w-full items-center justify-between px-4 py-2.5 text-left transition-colors ${isSelected
                                        ? "bg-slate-800/50 opacity-50 cursor-not-allowed"
                                        : "hover:bg-slate-800 cursor-pointer"
                                    }`}
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-100">{r.symbol}</span>
                                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                            {r.type}
                                        </Badge>
                                        {r.exchange && (
                                            <span className="text-[10px] text-slate-500">{r.exchange}</span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 truncate mt-0.5">{r.name}</p>
                                </div>
                                {isSelected ? (
                                    <span className="text-xs text-emerald-400 ml-2">Added</span>
                                ) : (
                                    <Plus className="h-4 w-4 text-blue-400 ml-2 flex-shrink-0" />
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

interface TickerChipsProps {
    tickers: string[];
    onRemove: (symbol: string) => void;
}

export function TickerChips({ tickers, onRemove }: TickerChipsProps) {
    if (tickers.length === 0) return null;
    return (
        <div className="flex flex-wrap gap-1.5 mt-2">
            {tickers.map((t) => (
                <span
                    key={t}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-600/20 border border-blue-500/30 px-2.5 py-1 text-xs font-medium text-blue-300"
                >
                    {t}
                    <button
                        onClick={() => onRemove(t)}
                        className="hover:text-red-400 transition-colors"
                    >
                        <X className="h-3 w-3" />
                    </button>
                </span>
            ))}
        </div>
    );
}
