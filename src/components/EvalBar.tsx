import React from 'react';
import { PlayerColor } from '../types/chess';

interface EvalBarProps {
  evalCp: number; // positive favors White
  orientation: PlayerColor;
}

export const EvalBar: React.FC<EvalBarProps> = ({ evalCp, orientation }) => {
  // Convert centipawns into white share percentage [5..95] using smooth logistic curve
  const isMateWhite = evalCp > 50000;
  const isMateBlack = evalCp < -50000;

  let whitePercent = 50;
  if (isMateWhite) {
    whitePercent = 98;
  } else if (isMateBlack) {
    whitePercent = 2;
  } else {
    const pawns = evalCp / 100;
    const winProb = 1 / (1 + Math.pow(10, -pawns / 4));
    whitePercent = Math.max(4, Math.min(96, winProb * 100));
  }

  const label = isMateWhite
    ? 'M+'
    : isMateBlack
    ? 'M-'
    : `${evalCp >= 0 ? '+' : ''}${(evalCp / 100).toFixed(1)}`;

  const topColorIsWhite = orientation === 'b';
  const topHeightPercent = topColorIsWhite ? whitePercent : 100 - whitePercent;

  return (
    <div
      className="hidden sm:flex flex-col items-center w-7 shrink-0 select-none"
      aria-label={`Position evaluation: ${label}`}
      title={`Evaluation: ${label}`}
    >
      <div className="relative w-5 flex-1 min-h-[360px] rounded overflow-hidden border border-white/15 bg-[#1B222C] flex flex-col">
        {/* Top bar section */}
        <div
          className={`w-full transition-all duration-300 ease-out ${
            topColorIsWhite ? 'bg-[#F3EFE6]' : 'bg-[#1F2733]'
          }`}
          style={{ height: `${topHeightPercent}%` }}
        />
        {/* Bottom bar section */}
        <div
          className={`w-full flex-1 transition-all duration-300 ease-out ${
            topColorIsWhite ? 'bg-[#1F2733]' : 'bg-[#F3EFE6]'
          }`}
        />
        {/* Midpoint tick */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-amber-500/60 pointer-events-none" />
      </div>
      <span className="mt-1.5 text-[11px] font-mono tabular-nums font-semibold text-slate-300">
        {label}
      </span>
    </div>
  );
};
