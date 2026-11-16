import React from 'react';
import { Trophy, Swords, Play, RotateCcw, Crown } from 'lucide-react';
import { TIME_CONTROLS } from '../data/rivals';
import { BracketMatch, BracketParticipant, PlayerProfile, TournamentState } from '../types/chess';

interface TournamentViewProps {
  tournament: TournamentState | null;
  playerProfile: PlayerProfile;
  selectedTimeControlId: string;
  onSelectTimeControl: (id: string) => void;
  onStartTournament: () => void;
  onPlayBracketMatch: (match: BracketMatch) => void;
}

const ParticipantRow: React.FC<{
  participant: BracketParticipant | null;
  isWinner: boolean;
  isEliminated: boolean;
}> = ({ participant, isWinner, isEliminated }) => {
  if (!participant) {
    return (
      <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-500 bg-[#180a03] border border-amber-400/15">
        <span>Awaiting Winner</span>
        <span className="font-mono tabular-nums">—</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center justify-between gap-2 px-3 py-2 rounded border transition-colors ${
        isWinner
          ? 'bg-amber-500/12 border-amber-500/45 text-amber-100'
          : isEliminated
          ? 'bg-[#180a03] border-amber-400/10 text-amber-200/45'
          : participant.isPlayer
          ? 'bg-[#2a1306] border-amber-400/35 text-amber-50'
          : 'bg-[#241005] border-amber-400/20 text-amber-100'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {participant.avatarUrl ? (
          <img
            src={participant.avatarUrl}
            alt={participant.name}
            referrerPolicy="no-referrer"
            className="w-6 h-6 rounded object-cover shrink-0 border border-white/15"
          />
        ) : (
          <div className="w-6 h-6 rounded bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-[10px] font-bold text-amber-300 shrink-0">
            {participant.name.slice(0, 2).toUpperCase()}
          </div>
        )}
        <span className={`text-xs font-medium truncate ${participant.isPlayer ? 'font-semibold' : ''}`}>
          {participant.name}
          {participant.isPlayer ? ' (You)' : ''}
        </span>
      </div>
      <span className="text-[11px] font-mono tabular-nums text-slate-400 shrink-0">
        {participant.elo}
      </span>
    </div>
  );
};

export const TournamentView: React.FC<TournamentViewProps> = ({
  tournament,
  playerProfile,
  selectedTimeControlId,
  onSelectTimeControl,
  onStartTournament,
  onPlayBracketMatch,
}) => {
  const activePlayerMatch = tournament?.matches.find(
    (m) =>
      m.round === tournament.currentRound &&
      !m.winnerId &&
      (m.playerA?.isPlayer || m.playerB?.isPlayer)
  );

  const qfMatches = tournament?.matches.filter((m) => m.round === 1) ?? [];
  const sfMatches = tournament?.matches.filter((m) => m.round === 2) ?? [];
  const finalMatch = tournament?.matches.find((m) => m.round === 3);

  const roundTitle =
    tournament?.currentRound === 1
      ? 'Quarterfinals'
      : tournament?.currentRound === 2
      ? 'Semifinals'
      : 'Grand Final';

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-white/10">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-amber-400 font-medium">
            <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
            <span>8-Player Knockout Championship</span>
            <span aria-hidden="true">·</span>
            <span>Single Elimination</span>
          </div>
          <h1
            className="text-3xl sm:text-4xl font-bold text-slate-50 tracking-tight"
            style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
          >
            Grandmaster Knockout Cup
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Win three consecutive knockout rounds against seeded masters to lift the Championship Cup and earn +50 bonus rating points.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          {!tournament || tournament.status !== 'active' ? (
            <>
              <div className="flex items-center gap-1 p-1 bg-[#180a03] border border-amber-400/25 rounded-lg">
                {TIME_CONTROLS.filter((tc) => ['3+2', '5+0', '10+0'].includes(tc.id)).map((tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => onSelectTimeControl(tc.id)}
                    className={`px-3 py-1.5 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      selectedTimeControlId === tc.id
                        ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-bold'
                        : 'text-amber-100/80 hover:text-amber-50'
                    }`}
                  >
                    {tc.label} {tc.category}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={onStartTournament}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors whitespace-nowrap shrink-0"
              >
                <Swords className="w-4 h-4" aria-hidden="true" />
                <span>{tournament ? 'Start New Cup' : 'Enter Championship'}</span>
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onStartTournament}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/25 text-amber-100 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Restart Bracket</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Callout or Empty State */}
      {!tournament ? (
        <div className="bg-[#241005]/95 border border-amber-400/25 rounded-xl p-8 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
            <Crown className="w-6 h-6" aria-hidden="true" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-lg font-semibold text-slate-100">
              No Active Tournament Bracket
            </h2>
            <p className="text-sm text-slate-400">
              Seeded at <span className="font-mono tabular-nums text-amber-400">{playerProfile.elo} Elo</span>. Select your preferred Blitz or Rapid time control above and enter the 8-player bracket.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartTournament}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4" aria-hidden="true" />
            <span>Seed & Start Cup</span>
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Status Summary Strip */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#241005]/95 border border-amber-400/25">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span>{tournament.name}</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono">{tournament.timeControlId}</span>
                <span aria-hidden="true">·</span>
                <span className="text-amber-400 font-medium">
                  {tournament.status === 'champion'
                    ? 'Champion Crowned'
                    : tournament.status === 'eliminated'
                    ? 'Eliminated'
                    : `${roundTitle} Active`}
                </span>
              </div>
              <p className="text-sm font-semibold text-slate-100">
                {tournament.status === 'champion'
                  ? `Victory! You conquered the Grandmaster Knockout Cup.`
                  : tournament.status === 'eliminated'
                  ? `You were knocked out in the ${roundTitle}. Start a fresh bracket to try again.`
                  : activePlayerMatch
                  ? `Next Match: ${activePlayerMatch.playerA?.name} vs ${activePlayerMatch.playerB?.name}`
                  : 'Bracket Ready'}
              </p>
            </div>

            {tournament.status === 'active' && activePlayerMatch && (
              <button
                type="button"
                onClick={() => onPlayBracketMatch(activePlayerMatch)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <Play className="w-4 h-4" aria-hidden="true" />
                <span>Play {roundTitle} Match</span>
              </button>
            )}
          </div>

          {/* 3-Column Knockout Bracket */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Round 1: Quarterfinals */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-white/8">
                <span>01. Quarterfinals</span>
                <span className="font-mono">4 Matches</span>
              </div>
              <div className="space-y-4">
                {qfMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-3 rounded-lg bg-[#241005]/95 border border-amber-400/25 space-y-2"
                  >
                    <ParticipantRow
                      participant={match.playerA}
                      isWinner={match.winnerId === match.playerA?.id}
                      isEliminated={Boolean(match.winnerId && match.winnerId !== match.playerA?.id)}
                    />
                    <ParticipantRow
                      participant={match.playerB}
                      isWinner={match.winnerId === match.playerB?.id}
                      isEliminated={Boolean(match.winnerId && match.winnerId !== match.playerB?.id)}
                    />
                    {match.scoreLabel && (
                      <div className="text-[11px] text-slate-400 text-right font-mono">
                        {match.scoreLabel}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Round 2: Semifinals */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-400 pb-2 border-b border-white/8">
                <span>02. Semifinals</span>
                <span className="font-mono">2 Matches</span>
              </div>
              <div className="space-y-6 md:pt-14">
                {sfMatches.map((match) => (
                  <div
                    key={match.id}
                    className="p-3 rounded-lg bg-[#241005]/95 border border-amber-400/25 space-y-2"
                  >
                    <ParticipantRow
                      participant={match.playerA}
                      isWinner={match.winnerId === match.playerA?.id}
                      isEliminated={Boolean(match.winnerId && match.winnerId !== match.playerA?.id)}
                    />
                    <ParticipantRow
                      participant={match.playerB}
                      isWinner={match.winnerId === match.playerB?.id}
                      isEliminated={Boolean(match.winnerId && match.winnerId !== match.playerB?.id)}
                    />
                    {match.scoreLabel && (
                      <div className="text-[11px] text-slate-400 text-right font-mono">
                        {match.scoreLabel}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Round 3: Grand Final */}
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-400 pb-2 border-b border-amber-500/25">
                <span>03. Grand Final</span>
                <span className="font-mono">Championship</span>
              </div>
              <div className="md:pt-36">
                {finalMatch && (
                  <div className="p-4 rounded-xl bg-[#2a1306] border border-amber-400/45 space-y-2.5 shadow-xl">
                    <div className="flex items-center justify-between text-xs text-amber-400 font-medium mb-1">
                      <span>Title Decider</span>
                      <Trophy className="w-3.5 h-3.5" aria-hidden="true" />
                    </div>
                    <ParticipantRow
                      participant={finalMatch.playerA}
                      isWinner={finalMatch.winnerId === finalMatch.playerA?.id}
                      isEliminated={Boolean(
                        finalMatch.winnerId && finalMatch.winnerId !== finalMatch.playerA?.id
                      )}
                    />
                    <ParticipantRow
                      participant={finalMatch.playerB}
                      isWinner={finalMatch.winnerId === finalMatch.playerB?.id}
                      isEliminated={Boolean(
                        finalMatch.winnerId && finalMatch.winnerId !== finalMatch.playerB?.id
                      )}
                    />
                    {finalMatch.scoreLabel && (
                      <div className="text-[11px] text-amber-300 text-right font-mono">
                        {finalMatch.scoreLabel}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
