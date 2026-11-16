import React, { useState } from 'react';
import { Trophy, RotateCcw, Copy, Check, ArrowRight, Eye, Globe2 } from 'lucide-react';
import { GameResult, MatchMode, PlayerColor } from '../types/chess';

interface PostMatchModalProps {
  result: GameResult;
  mode: MatchMode;
  playerColor: PlayerColor;
  opponentName: string;
  openingName: string;
  pgnText: string;
  onRematch: () => void;
  onReviewBoard: () => void;
  onReturnToBracket?: () => void;
  onReturnToLeague?: () => void;
  onReturnToMoradabad?: () => void;
  moradabadLeagueTitle?: string | null;
}

export const PostMatchModal: React.FC<PostMatchModalProps> = ({
  result,
  mode,
  playerColor,
  opponentName,
  openingName,
  pgnText,
  onRematch,
  onReviewBoard,
  onReturnToBracket,
  onReturnToLeague,
  onReturnToMoradabad,
  moradabadLeagueTitle,
}) => {
  const [copiedPgn, setCopiedPgn] = useState(false);

  const isDraw = result.winner === 'draw';
  const playerWon =
    mode === 'local'
      ? result.winner !== 'draw'
      : result.winner === playerColor;

  const headline = isDraw
    ? 'Match Drawn'
    : mode === 'local'
    ? `${result.winner === 'w' ? 'White' : 'Black'} Wins`
    : playerWon
    ? 'Victory'
    : 'Defeat';

  const reasonLabelMap: Record<GameResult['reason'], string> = {
    checkmate: 'by Checkmate',
    timeout: 'on Time',
    resignation: 'by Resignation',
    stalemate: 'by Stalemate',
    repetition: 'by Threefold Repetition',
    insufficient: 'by Insufficient Material',
    'fifty-move': 'by 50-Move Rule',
    agreement: 'by Mutual Agreement',
  };

  const handleCopyPgn = () => {
    navigator.clipboard?.writeText(pgnText).catch(() => {});
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 1800);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/80 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#241005] border border-amber-400/30 shadow-2xl p-6 space-y-5 text-amber-50">
        {/* Result Title */}
        <div className="text-center space-y-1.5">
          {result.tournamentChampion && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-300 mb-1">
              <Trophy className="w-4 h-4" aria-hidden="true" />
              <span>Championship Cup Winner</span>
            </div>
          )}
          {result.leaguePrizeWon && result.leaguePrizeWon > 0 && (
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-300 mb-1">
              <Globe2 className="w-4 h-4" aria-hidden="true" />
              <span>World League Prize Won: ₹{result.leaguePrizeWon.toLocaleString('en-IN')}</span>
            </div>
          )}
          <h2
            className={`text-3xl font-bold ${
              isDraw ? 'text-amber-50' : playerWon ? 'text-amber-300' : 'text-amber-100'
            }`}
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {headline}
          </h2>
          <p className="text-sm text-amber-200/80">
            {reasonLabelMap[result.reason]} · vs {opponentName}
          </p>
          <p className="text-xs text-amber-200/60">{openingName}</p>
        </div>

        {/* Rating & Accuracy Breakdown */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3.5 rounded-lg bg-[#180a03] border border-amber-400/20 text-center">
            <div className="text-xs text-amber-200/75">
              {mode === 'local' ? 'White Accuracy' : 'Updated Rating'}
            </div>
            {mode === 'local' ? (
              <div className="mt-1 text-xl font-mono tabular-nums font-bold text-amber-50">
                {result.accuracyWhite}%
              </div>
            ) : (
              <div className="mt-1 flex items-baseline justify-center gap-1.5 font-mono tabular-nums">
                <span className="text-xl font-bold text-amber-50">{result.newElo}</span>
                <span
                  className={`text-xs font-semibold ${
                    result.eloDelta > 0
                      ? 'text-emerald-300'
                      : result.eloDelta < 0
                      ? 'text-red-300'
                      : 'text-amber-200/70'
                  }`}
                >
                  ({result.eloDelta > 0 ? `+${result.eloDelta}` : result.eloDelta})
                </span>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-lg bg-[#180a03] border border-amber-400/20 text-center">
            <div className="text-xs text-amber-200/75">
              {mode === 'local' ? 'Black Accuracy' : 'Match Accuracy'}
            </div>
            <div className="mt-1 text-xl font-mono tabular-nums font-bold text-amber-50">
              {mode === 'local'
                ? `${result.accuracyBlack}%`
                : `${playerColor === 'w' ? result.accuracyWhite : result.accuracyBlack}%`}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2.5">
          {mode === 'tournament' && onReturnToBracket ? (
            <button
              type="button"
              onClick={onReturnToBracket}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors"
            >
              <span>{result.tournamentAdvanced ? 'Advance in Bracket' : 'View Tournament Bracket'}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : mode === 'league' && onReturnToLeague ? (
            <button
              type="button"
              onClick={onReturnToLeague}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors"
            >
              <span>View World League Standings</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : onReturnToMoradabad ? (
            <button
              type="button"
              onClick={onReturnToMoradabad}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-sm font-bold transition-colors"
            >
              <span>
                {moradabadLeagueTitle
                  ? `Back to ${moradabadLeagueTitle}`
                  : 'View League Standings'}
              </span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onRematch}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors"
            >
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span>{mode === 'friend' ? 'Request Rematch' : 'Play Again'}</span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={onReviewBoard}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/20 text-xs font-medium text-amber-100 transition-colors"
            >
              <Eye className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Analyze Board</span>
            </button>

            <button
              type="button"
              onClick={handleCopyPgn}
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/20 text-xs font-medium text-amber-100 transition-colors"
            >
              {copiedPgn ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                  <span>PGN Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Copy PGN</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
