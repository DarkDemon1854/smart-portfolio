"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SliderProps
    extends React.InputHTMLAttributes<HTMLInputElement> {
    min?: number;
    max?: number;
    step?: number;
    value?: number;
    onValueChange?: (value: number) => void;
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
    ({ className, min = 0, max = 100, step = 1, value = 50, onValueChange, ...props }, ref) => {
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            const newValue = parseFloat(e.target.value);
            onValueChange?.(newValue);
        };

        return (
            <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={handleChange}
                className={cn(
                    "w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary",
                    className
                )}
                ref={ref}
                {...props}
            />
        );
    }
);
Slider.displayName = "Slider";

export { Slider };
