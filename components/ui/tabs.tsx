"use client";

import { useState, ReactNode } from "react";

interface Tab {
    id: string;
    label: string;
    content: ReactNode;
}

interface TabsProps {
    tabs: Tab[];
    defaultTab?: string;
}

export function Tabs({ tabs, defaultTab }: TabsProps) {
    const [active, setActive] = useState(defaultTab || tabs[0]?.id || "");

    const current = tabs.find((t) => t.id === active);

    return (
        <div>
            <div className="flex gap-1 border-b border-slate-700 pb-px">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActive(tab.id)}
                        className={`rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors ${active === tab.id
                                ? "border-b-2 border-blue-500 bg-slate-800/50 text-blue-400"
                                : "text-slate-400 hover:bg-slate-800/30 hover:text-slate-200"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>
            <div className="pt-4">{current?.content}</div>
        </div>
    );
}
