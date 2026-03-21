"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/utils";

export interface LightBeamButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  className?: string;
  gradientColors?: [string, string, string];
}

export function LightBeamButton({
  children,
  className,
  onClick,
  disabled,
  gradientColors = ["#8b5cf6", "#06b6d4", "#8b5cf6"],
  ...props
}: LightBeamButtonProps) {
  const gradientString = `conic-gradient(from var(--gradient-angle), transparent 0%, ${gradientColors[0]} 40%, ${gradientColors[1]} 50%, transparent 60%, transparent 100%)`;

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className={cn(
        "group relative isolate overflow-hidden rounded-full px-8 py-3 text-sm font-medium text-white transition-all",
        "bg-neutral-950 hover:bg-neutral-900",
        "shadow-[0_0_20px_-5px_rgba(139,92,246,0.3)] hover:shadow-[0_0_25px_-5px_rgba(139,92,246,0.5)]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none",
        className
      )}
      {...(props as any)}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>

      <div
        className={cn(
          "absolute inset-0 -z-10 rounded-full p-[1px]",
          !disabled && "animate-border-spin"
        )}
        style={{ background: gradientString } as React.CSSProperties}
      />

      <div className="absolute inset-[1px] -z-10 rounded-full bg-neutral-950" />

      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_0%,rgba(139,92,246,0.15)_0%,transparent_60%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
    </motion.button>
  );
}
