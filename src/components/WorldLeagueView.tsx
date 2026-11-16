import React, { useState } from 'react';
import {
  Award,
  Check,
  Crown,
  Globe2,
  Link2,
  Swords,
  Trophy,
  Users,
  Wallet,
} from 'lucide-react';
import {
  LeagueDifficulty,
  PlayerProfile,
  WorldLiveState,
} from '../types/chess';
import { LEAGUE_PRIZES, LEAGUE_PRIZE_POOL, LEAGUE_TIERS } from '../utils/worldLeague';

interface WorldLeagueViewProps {
  worldLeague: WorldLiveState;
  worldError: string | null;
  profile: PlayerProfile;
  selectedDifficulty: LeagueDifficulty;
  onSelectDifficulty: (d: LeagueDifficulty) => void;
  onEnterWorldLeague: (d: LeagueDifficulty) => void;
  onFindMatch: (timeControlId: string) => void;
  onCancelWait: () => void;
  onChallengePlayer: (targetPlayerId: string, timeControlId: string) => void;
  onSettlePrizes: () => void;
  onOpenWallet: () => void;
}

export const WorldLeagueView: React.FC<WorldLeagueViewProps> = ({
  worldLeague,
  worldError,
  profile,
  selectedDifficulty,
  onSelectDifficulty,
  onEnterWorldLeague,
  onFindMatch,
  onCancelWait,
  onChallengePlayer,
  onSettlePrizes,
  onOpenWallet,
}) => {
  const [timeControl, setTimeControl] = useState('5+0');
  const [copiedInvite, setCopiedInvite] = useState(false);

  const activeTier =
    LEAGUE_TIERS.find((t) => t.id === selectedDifficulty) ?? LEAGUE_TIERS[0];
  const myEntry = worldLeague.players.find((p) => p.playerId === profile.id) ?? null;
  const otherOnlineCount = worldLeague.players.filter(
    (p) => p.playerId !== profile.id && p.online
  ).length;
  const canAffordEntry = profile.walletBalance >= activeTier.entryFee;

  const inviteUrl = `${window.location.origin}${window.location.pathname}?tab=league`;

  const handleCopyInvite = () => {
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 1800);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
      {/* World Chess League Hero & Tier Economics */}
      <section className="rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-amber-300 font-semibold">
              <Globe2 className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>World Chess League</span>
              <span aria-hidden="true">·</span>
              <span>Human vs Human Only (No Computer)</span>
              <span aria-hidden="true">·</span>
              <span>{worldLeague.players.length} / {worldLeague.maxPlayers} Players</span>
            </div>
            <h1
              className="text-2xl sm:text-4xl font-bold text-amber-50 tracking-tight"
              style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
            >
              World Chess League Championship
            </h1>
            <p className="text-sm text-amber-100/80 leading-relaxed">
              Only real entered players compete against each other for the{' '}
              <strong className="text-amber-300">
                ₹{LEAGUE_PRIZE_POOL.toLocaleString('en-IN')} Prize Pool (3:2:1 ratio)
              </strong>
              . Pick your entry tier — Normal (₹500), Hard (₹1,000), Hardcore (₹2,000), or Expert (₹3,000) — and challenge any player in the league lobby.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onOpenWallet}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/25 text-xs font-semibold text-amber-100 transition-colors whitespace-nowrap"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
              <span>
                Wallet:{' '}
                <strong className="font-mono tabular-nums text-emerald-300">
                  ₹{profile.walletBalance.toLocaleString('en-IN')}
                </strong>{' '}
                · Deposit
              </span>
            </button>

            {!myEntry && (
              canAffordEntry ? (
                <button
                  type="button"
                  onClick={() => onEnterWorldLeague(activeTier.id)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors whitespace-nowrap"
                >
                  <Crown className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Join World League ({activeTier.label}) · ₹{activeTier.entryFee.toLocaleString('en-IN')}
                  </span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenWallet}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors whitespace-nowrap"
                >
                  <Wallet className="w-4 h-4" aria-hidden="true" />
                  <span>
                    Add ₹{activeTier.entryFee.toLocaleString('en-IN')} to Enter ({activeTier.label})
                  </span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Entry Tier Selector (Normal 500, Hard 1000, Hardcore 2000, Expert 3000) */}
        {!myEntry && (
          <div className="space-y-2.5 pt-3 border-t border-amber-400/15">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-amber-200/75">
              <span>Select Entry Tier (Jama Raashi)</span>
              <span>Prize Pool Fixed at ₹50,000</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {LEAGUE_TIERS.map((tier) => {
                const isSelected = tier.id === selectedDifficulty;
                return (
                  <button
                    key={tier.id}
                    type="button"
                    onClick={() => onSelectDifficulty(tier.id)}
                    className={`p-3.5 rounded-xl border text-left transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 text-amber-50'
                        : 'bg-[#180a03] border-amber-400/15 text-amber-100/80 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold">{tier.label}</span>
                      <span className="text-sm font-mono tabular-nums font-bold text-amber-300">
                        ₹{tier.entryFee.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-200/70">{tier.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3:2:1 Ratio ₹50,000 Prize Breakdown */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 pt-3 border-t border-amber-400/15">
          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/15">
            <div className="text-xs text-amber-200/75">Total Prize Pool</div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-300">
              ₹{LEAGUE_PRIZE_POOL.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">
              Max 50 Players · 3 : 2 : 1
            </div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/45">
            <div className="text-xs text-amber-300 font-semibold">1st Place (3/6 Share)</div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-200">
              ₹{LEAGUE_PRIZES.first.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">50% of ₹50,000</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/25">
            <div className="text-xs text-amber-100/85 font-semibold">2nd Place (2/6 Share)</div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-50">
              ₹{LEAGUE_PRIZES.second.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">33.3% of ₹50,000</div>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl bg-[#180a03] border border-amber-400/20">
            <div className="text-xs text-amber-100/85 font-semibold">3rd Place (1/6 Share)</div>
            <div className="mt-1 text-lg sm:text-xl font-mono tabular-nums font-bold text-amber-50">
              ₹{LEAGUE_PRIZES.third.toLocaleString('en-IN')}
            </div>
            <div className="mt-1 text-[11px] text-amber-200/65">16.7% of ₹50,000</div>
          </div>
        </div>
      </section>

      {worldError && (
        <div className="p-3.5 rounded-xl bg-red-950/70 border border-red-400/45 text-xs text-red-100">
          {worldError}
        </div>
      )}

      {/* Live Human-vs-Human Matchmaking Lobby */}
      <section className="rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 sm:p-6 space-y-5 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
              <Swords className="w-4 h-4" aria-hidden="true" />
              <span>Live Human-vs-Human League Arena (Zero Bots)</span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-amber-50">
              Entered World League Players ({worldLeague.players.length})
            </h2>
          </div>

          <button
            type="button"
            onClick={handleCopyInvite}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/25 text-xs font-semibold text-amber-100 whitespace-nowrap"
          >
            {copiedInvite ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                <span>World League Link Copied</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                <span>Invite Human Challengers</span>
              </>
            )}
          </button>
        </div>

        {myEntry && (
          <div className="p-4 rounded-xl bg-emerald-950/45 border border-emerald-400/35 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-emerald-300">
                Entered World League: {myEntry.name} ({myEntry.tierId.toUpperCase()} · ₹
                {myEntry.entryFeePaid.toLocaleString('en-IN')})
              </div>
              <div className="text-xs text-amber-100/80">
                {myEntry.waitingForMatch
                  ? 'Searching live lobby — match starts automatically when another entered human player joins!'
                  : `${otherOnlineCount} other entered human player(s) online right now.`}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <select
                value={timeControl}
                onChange={(e) => setTimeControl(e.target.value)}
                aria-label="World League Time Control"
                className="px-2.5 py-2 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs font-mono text-amber-50"
              >
                <option value="3+2">3+2 Blitz</option>
                <option value="5+0">5+0 Blitz</option>
                <option value="10+0">10+0 Rapid</option>
              </select>

              {myEntry.waitingForMatch ? (
                <button
                  type="button"
                  onClick={onCancelWait}
                  className="px-3.5 py-2 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/30 text-xs font-semibold text-amber-100 whitespace-nowrap"
                >
                  Cancel Search
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => onFindMatch(timeControl)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold whitespace-nowrap"
                >
                  <Swords className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Find Human Opponent</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Standings Table */}
        {worldLeague.players.length === 0 ? (
          <div className="p-6 rounded-xl bg-[#180a03] border border-amber-400/15 text-center space-y-2">
            <Users className="w-6 h-6 text-amber-300 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-amber-50">
              No human players have entered the current World League lobby yet.
            </p>
            <p className="text-xs text-amber-200/75 max-w-lg mx-auto">
              Select an entry tier above (Normal ₹500 – Expert ₹3,000) to join, then share the World League link with another player (or open a second browser tab) to play real human-vs-human matches!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto arena-scroll rounded-xl border border-amber-400/20 bg-[#180a03]">
            <table className="w-full text-left border-collapse min-w-[540px]">
              <thead className="sticky top-0 bg-[#241005] border-b border-amber-400/20 text-[11px] text-amber-200/80">
                <tr>
                  <th className="py-2.5 px-3 font-medium">Rank</th>
                  <th className="py-2.5 px-3 font-medium">Player</th>
                  <th className="py-2.5 px-3 font-medium">Tier</th>
                  <th className="py-2.5 px-3 font-medium text-right">Elo</th>
                  <th className="py-2.5 px-3 font-medium text-right">W-D-L</th>
                  <th className="py-2.5 px-3 font-medium text-right">Pts</th>
                  <th className="py-2.5 px-3 font-medium text-right">Prize</th>
                  <th className="py-2.5 px-3 font-medium text-right">Play</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-400/10 text-xs">
                {worldLeague.players.map((p, idx) => {
                  const rank = idx + 1;
                  const isMe = p.playerId === profile.id;
                  const prize =
                    rank === 1
                      ? LEAGUE_PRIZES.first
                      : rank === 2
                      ? LEAGUE_PRIZES.second
                      : rank === 3
                      ? LEAGUE_PRIZES.third
                      : 0;
                  return (
                    <tr
                      key={p.playerId}
                      className={isMe ? 'bg-amber-500/15 font-semibold' : 'hover:bg-amber-400/[0.04]'}
                    >
                      <td className="py-2.5 px-3 font-mono text-amber-200">#{rank}</td>
                      <td className="py-2.5 px-3 text-amber-50">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              p.online ? 'bg-emerald-400' : 'bg-stone-500'
                            }`}
                          />
                          <span className="truncate max-w-[140px]">
                            {p.name} {isMe ? '(You)' : ''}
                          </span>
                          {p.waitingForMatch && (
                            <span className="text-[10px] font-mono text-emerald-300">· Ready</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 capitalize text-amber-200/80 font-mono">
                        {p.tierId}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-200">
                        {p.elo}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-amber-200/75">
                        {p.wins}-{p.draws}-{p.losses}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-amber-50">
                        {p.points}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-emerald-300">
                        {prize > 0 ? `₹${prize.toLocaleString('en-IN')}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isMe ? (
                          <span className="text-[11px] text-amber-300/60">You</span>
                        ) : p.online ? (
                          <button
                            type="button"
                            disabled={!myEntry}
                            onClick={() => onChallengePlayer(p.playerId, timeControl)}
                            className="px-2.5 py-1 rounded bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 text-stone-950 text-[11px] font-bold"
                          >
                            Play
                          </button>
                        ) : (
                          <span className="text-[11px] text-amber-200/45">Offline</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Top 3 World Podium & Settlement */}
        {worldLeague.players.length > 0 && (
          <div className="p-4 rounded-xl bg-[#180a03] border border-amber-400/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-300">
                <Trophy className="w-4 h-4" aria-hidden="true" />
                <span>Top 3 World League Winners Podium (3:2:1 · ₹50,000 Pool)</span>
              </div>

              {!worldLeague.payoutSettled && worldLeague.recentMatches.length > 0 && (
                <button
                  type="button"
                  onClick={onSettlePrizes}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs font-bold"
                >
                  Finalize & Award Top 3 Prizes
                </button>
              )}
              {worldLeague.payoutSettled && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-300">
                  <Award className="w-3.5 h-3.5" aria-hidden="true" />
                  Top 3 Prizes Finalized
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[0, 1, 2].map((idx) => {
                const winner = worldLeague.players[idx];
                const prize =
                  idx === 0
                    ? LEAGUE_PRIZES.first
                    : idx === 1
                    ? LEAGUE_PRIZES.second
                    : LEAGUE_PRIZES.third;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-[#241005] border border-amber-400/20 space-y-1"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-amber-300">Rank #{idx + 1}</span>
                      <span className="font-mono font-bold text-emerald-300">
                        ₹{prize.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-amber-50 truncate">
                      {winner ? winner.name : 'Awaiting Player'}
                    </div>
                    <div className="text-[11px] text-amber-200/70 truncate">
                      {winner
                        ? `${winner.tierId.toUpperCase()} · ${winner.points} pts`
                        : 'Play human matches to claim'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Recent Human Matches */}
        {worldLeague.recentMatches.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs font-semibold text-amber-200">
              Recent World League Matches (Human vs Human)
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto arena-scroll">
              {worldLeague.recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="px-3 py-2 rounded-lg bg-[#180a03] border border-amber-400/15 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-amber-100 truncate">
                    <strong>{m.whiteName}</strong> vs <strong>{m.blackName}</strong>
                  </span>
                  <span className="font-mono text-amber-300 shrink-0">
                    {m.winner === 'draw'
                      ? 'Draw (½-½)'
                      : m.winner === 'w'
                      ? `${m.whiteName} Won`
                      : `${m.blackName} Won`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
