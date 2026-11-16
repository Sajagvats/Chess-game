import React, { useState } from 'react';
import { PieceSymbol } from 'chess.js';
import { Clock, AlertTriangle } from 'lucide-react';
import { PlayerColor } from '../types/chess';
import { PieceSvg } from './ChessPieces';

interface MatchClockCardProps {
  name: string;
  subtitle: string;
  elo: number;
  avatarUrl?: string;
  color: PlayerColor;
  timeRemainingMs: number;
  isActiveTurn: boolean;
  isThinking?: boolean;
  isGameOver: boolean;
  capturedPieces: PieceSymbol[];
  materialAdvantage: number; // positive means this player is ahead
}

export function formatClockMs(ms: number): string {
  const clamped = Math.max(0, ms);
  const totalSeconds = Math.floor(clamped / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (clamped < 20000) {
    const tenths = Math.floor((clamped % 1000) / 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export const MatchClockCard: React.FC<MatchClockCardProps> = ({
  name,
  subtitle,
  elo,
  avatarUrl,
  color,
  timeRemainingMs,
  isActiveTurn,
  isThinking = false,
  isGameOver,
  capturedPieces,
  materialAdvantage,
}) => {
  const [imgError, setImgError] = useState(false);
  const isLowTime = !isGameOver && timeRemainingMs < 20000 && timeRemainingMs > 0;
  const isFlagged = timeRemainingMs <= 0;

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border transition-colors ${
        isActiveTurn && !isGameOver
          ? 'bg-[#2c1306] border-amber-400/55 shadow-md'
          : 'bg-[#241005]/95 border-amber-400/20'
      }`}
    >
      {/* Left: Player identity + captured pieces */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="relative w-10 h-10 rounded-md overflow-hidden shrink-0 border border-amber-400/25 bg-[#180a03] flex items-center justify-center">
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-xs font-semibold text-amber-100 tracking-wide">{initials}</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-50 truncate">
            <span className="truncate">{name}</span>
            <span className="text-xs font-mono tabular-nums text-amber-300 font-medium shrink-0">
              {elo}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-amber-200/75 min-h-[18px]">
            <span className="truncate">{subtitle}</span>
            <span aria-hidden="true">·</span>
            <span className="shrink-0">{color === 'w' ? 'White' : 'Black'}</span>
            {isActiveTurn && !isGameOver && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-300 font-semibold shrink-0">
                  {isThinking ? 'Calculating' : 'To Move'}
                </span>
              </>
            )}
          </div>

          {/* Captured pieces row */}
          {capturedPieces.length > 0 && (
            <div className="flex items-center gap-1 mt-0.5">
              <div className="flex items-center -space-x-1">
                {capturedPieces.slice(0, 12).map((piece, idx) => (
                  <div key={`${piece}-${idx}`} className="w-4 h-4">
                    <PieceSvg type={piece} color={color === 'w' ? 'b' : 'w'} />
                  </div>
                ))}
              </div>
              {materialAdvantage > 0 && (
                <span className="text-[11px] font-mono tabular-nums text-emerald-300 font-semibold ml-1">
                  +{materialAdvantage}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Digital tournament clock */}
      <div
        className={`flex items-center gap-2 px-3.5 py-2 rounded-md border font-mono tabular-nums text-lg font-bold shrink-0 transition-colors ${
          isFlagged
            ? 'bg-red-950/75 border-red-400/60 text-red-200'
            : isLowTime && isActiveTurn
            ? 'bg-red-950/65 border-red-400/50 text-red-200'
            : isActiveTurn && !isGameOver
            ? 'bg-[#361708] border-amber-400/60 text-amber-200'
            : 'bg-[#180a03] border-amber-400/15 text-amber-200/70'
        }`}
      >
        {isLowTime && isActiveTurn ? (
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" aria-hidden="true" />
        ) : (
          <Clock className="w-4 h-4 opacity-70 shrink-0" aria-hidden="true" />
        )}
        <span>{formatClockMs(timeRemainingMs)}</span>
        {isLowTime && isActiveTurn && (
          <span className="text-[10px] font-sans font-semibold tracking-wide text-red-300">
            LOW
          </span>
        )}
      </div>
    </div>
  );
};
