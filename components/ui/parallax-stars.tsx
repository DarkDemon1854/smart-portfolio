"use client";

import { useMemo } from "react";

const generateBoxShadows = (n: number) => {
  let value = `${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  for (let i = 2; i <= n; i++) {
    value += `, ${Math.floor(Math.random() * 2000)}px ${Math.floor(Math.random() * 2000)}px #FFF`;
  }
  return value;
};

export function ParallaxStars({ speed = 1 }: { speed?: number }) {
  const shadowsSmall = useMemo(() => generateBoxShadows(700), []);
  const shadowsMedium = useMemo(() => generateBoxShadows(200), []);
  const shadowsBig = useMemo(() => generateBoxShadows(100), []);

  return (
    <>
      <style>{`
        @keyframes animStar {
          from { transform: translateY(0px); }
          to   { transform: translateY(-2000px); }
        }
      `}</style>

      {/* Deep-space radial gradient base */}
      <div
        className="fixed inset-0 -z-20"
        style={{ background: "radial-gradient(ellipse at bottom, #1B2735 0%, #090A0F 100%)" }}
      />

      {/* Layer 1 — small stars */}
      <div
        className="fixed left-0 top-0 -z-10 w-px h-px bg-transparent"
        style={{
          boxShadow: shadowsSmall,
          animation: `animStar ${50 / speed}s linear infinite`,
        }}
      >
        <div className="absolute top-[2000px] w-px h-px bg-transparent" style={{ boxShadow: shadowsSmall }} />
      </div>

      {/* Layer 2 — medium stars */}
      <div
        className="fixed left-0 top-0 -z-10 w-[2px] h-[2px] bg-transparent"
        style={{
          boxShadow: shadowsMedium,
          animation: `animStar ${100 / speed}s linear infinite`,
        }}
      >
        <div className="absolute top-[2000px] w-[2px] h-[2px] bg-transparent" style={{ boxShadow: shadowsMedium }} />
      </div>

      {/* Layer 3 — large stars */}
      <div
        className="fixed left-0 top-0 -z-10 w-[3px] h-[3px] bg-transparent"
        style={{
          boxShadow: shadowsBig,
          animation: `animStar ${150 / speed}s linear infinite`,
        }}
      >
        <div className="absolute top-[2000px] w-[3px] h-[3px] bg-transparent" style={{ boxShadow: shadowsBig }} />
      </div>
    </>
  );
}
