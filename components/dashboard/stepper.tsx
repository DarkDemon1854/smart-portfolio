"use client";

interface Step {
    label: string;
    complete: boolean;
    active: boolean;
}

interface StepperProps {
    steps: Step[];
}

export function Stepper({ steps }: StepperProps) {
    return (
        <div className="flex items-center gap-1 flex-wrap">
            {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-1">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        step.complete
                            ? "bg-emerald-900/50 text-emerald-300 border border-emerald-700/50"
                            : step.active
                            ? "bg-blue-900/50 text-blue-300 border border-blue-700/50 animate-pulse"
                            : "bg-slate-800/50 text-slate-500 border border-slate-700/50"
                    }`}>
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold ${
                            step.complete
                                ? "bg-emerald-600 text-white"
                                : step.active
                                ? "bg-blue-600 text-white"
                                : "bg-slate-700 text-slate-400"
                        }`}>
                            {step.complete ? "\u2713" : i + 1}
                        </span>
                        <span className="hidden sm:inline">{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`w-6 h-0.5 ${step.complete ? "bg-emerald-700" : "bg-slate-700"}`} />
                    )}
                </div>
            ))}
        </div>
    );
}
