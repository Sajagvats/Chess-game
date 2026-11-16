import React, { useState } from 'react';
import { Award, Check, Edit3, Swords } from 'lucide-react';
import { RIVALS } from '../data/rivals';
import { PlayerProfile, RivalProfile } from '../types/chess';

interface LadderViewProps {
  profile: PlayerProfile;
  onUpdateName: (name: string) => void;
  onChallengeRival: (rival: RivalProfile) => void;
}

export const LadderView: React.FC<LadderViewProps> = ({
  profile,
  onUpdateName,
  onChallengeRival,
}) => {
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(profile.name);

  const totalGames = profile.wins + profile.losses + profile.draws;
  const winRate = totalGames > 0 ? Math.round((profile.wins / totalGames) * 100) : 0;

  // Build combined sorted leaderboard
  const leaderboard = [
    ...RIVALS.map((r) => ({
      id: r.id,
      name: r.name,
      title: r.title,
      elo: r.elo,
      country: r.country,
      avatarUrl: r.avatarUrl,
      isPlayer: false,
      rival: r,
    })),
    {
      id: 'player',
      name: profile.name,
      title:
        profile.elo >= 2000
          ? 'Grandmaster Contender'
          : profile.elo >= 1600
          ? 'Master Contender'
          : profile.elo >= 1300
          ? 'Club Specialist'
          : 'Arena Challenger',
      elo: profile.elo,
      country: 'YOU',
      avatarUrl: undefined,
      isPlayer: true,
      rival: undefined,
    },
  ].sort((a, b) => b.elo - a.elo);

  const saveName = () => {
    const trimmed = draftName.trim();
    if (trimmed.length >= 2) {
      onUpdateName(trimmed.slice(0, 24));
    }
    setEditingName(false);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-10">
      {/* Player Competitive Profile Summary */}
      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Competitor Profile</span>
              <span aria-hidden="true">·</span>
              <span>Rated Standard</span>
            </div>
            {editingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && saveName()}
                  maxLength={24}
                  autoFocus
                  className="px-3 py-1.5 rounded-md bg-[#180a03] border border-amber-400/50 text-lg font-semibold text-amber-50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={saveName}
                  className="p-2 rounded-md bg-amber-500 text-slate-950 hover:bg-amber-400 transition-colors"
                  aria-label="Save name"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <h1
                  className="text-2xl sm:text-3xl font-bold text-slate-50"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {profile.name}
                </h1>
                <button
                  type="button"
                  onClick={() => {
                    setDraftName(profile.name);
                    setEditingName(true);
                  }}
                  className="p-1.5 rounded text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
                  aria-label="Edit player name"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Award className="w-4 h-4 text-amber-400" aria-hidden="true" />
            <span>
              Cup Titles: <strong className="text-slate-100 font-mono tabular-nums">{profile.trophies}</strong>
            </span>
          </div>
        </div>

        {/* 4-column KPI strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#241005]/95 border border-amber-400/25">
            <div className="text-xs text-slate-400">Current Rating</div>
            <div className="mt-1 text-2xl font-mono tabular-nums font-bold text-amber-400">
              {profile.elo} Elo
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Peak <span className="font-mono tabular-nums text-slate-200">{profile.peakElo}</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#241005]/95 border border-amber-400/25">
            <div className="text-xs text-slate-400">Match Record</div>
            <div className="mt-1 text-2xl font-mono tabular-nums font-bold text-slate-100">
              {profile.wins}W · {profile.draws}D · {profile.losses}L
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {totalGames} rated games played
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#241005]/95 border border-amber-400/25">
            <div className="text-xs text-slate-400">Win Percentage</div>
            <div className="mt-1 text-2xl font-mono tabular-nums font-bold text-emerald-400">
              {winRate}%
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Decisive victory rate
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#241005]/95 border border-amber-400/25">
            <div className="text-xs text-slate-400">Win Streak</div>
            <div className="mt-1 text-2xl font-mono tabular-nums font-bold text-slate-100">
              {profile.streak}
            </div>
            <div className="mt-1 text-xs text-slate-400">
              Consecutive victories
            </div>
          </div>
        </div>
      </section>

      {/* Arena Rankings Table */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100">Arena Standings</h2>
          <span className="text-xs text-slate-400">Challenge any ranked master directly</span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-amber-400/20 bg-[#241005]/95">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-xs text-slate-400">
                <th className="py-3 px-4 font-medium w-16">Rank</th>
                <th className="py-3 px-4 font-medium">Player</th>
                <th className="py-3 px-4 font-medium">Title</th>
                <th className="py-3 px-4 font-medium text-right">Rating</th>
                <th className="py-3 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/6 text-sm">
              {leaderboard.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={entry.isPlayer ? 'bg-amber-500/8' : 'hover:bg-white/[0.02]'}
                >
                  <td className="py-3.5 px-4 font-mono tabular-nums text-slate-300 font-semibold">
                    #{idx + 1}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      {entry.avatarUrl ? (
                        <img
                          src={entry.avatarUrl}
                          alt={entry.name}
                          referrerPolicy="no-referrer"
                          className="w-9 h-9 rounded-md object-cover border border-white/15 shrink-0"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-md bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xs font-bold text-amber-300 shrink-0">
                          {entry.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-slate-100">
                          {entry.name}
                          {entry.isPlayer && (
                            <span className="ml-2 text-xs font-normal text-amber-400">(You)</span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">{entry.country}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-slate-300 text-xs">{entry.title}</td>
                  <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-amber-300">
                    {entry.elo}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    {entry.rival ? (
                      <button
                        type="button"
                        onClick={() => onChallengeRival(entry.rival!)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#180a03] hover:bg-amber-400 hover:text-stone-950 border border-amber-400/25 text-xs font-medium text-amber-100 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Swords className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Challenge</span>
                      </button>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Match History */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-100">Recent Rated Matches</h2>
        {profile.history.length === 0 ? (
          <div className="p-8 rounded-xl border border-amber-400/20 bg-[#241005]/95 text-center text-sm text-slate-400">
            No completed rated matches yet. Play a rated match in the Arena to record your first result.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-amber-400/20 bg-[#241005]/95">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 text-xs text-slate-400">
                  <th className="py-3 px-4 font-medium">Opponent</th>
                  <th className="py-3 px-4 font-medium">Opening</th>
                  <th className="py-3 px-4 font-medium">Format</th>
                  <th className="py-3 px-4 font-medium">Result</th>
                  <th className="py-3 px-4 font-medium text-right">Accuracy</th>
                  <th className="py-3 px-4 font-medium text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6 text-sm">
                {profile.history.slice(0, 15).map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-100">{item.opponentName}</div>
                      <div className="text-xs text-slate-400 font-mono tabular-nums">
                        {item.opponentElo} Elo · {item.playerColor === 'w' ? 'White' : 'Black'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-300">{item.opening}</td>
                    <td className="py-3 px-4 text-xs font-mono text-slate-400">
                      {item.timeControlLabel} · {item.movesCount}m
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold">
                      <span
                        className={
                          item.result === 'win'
                            ? 'text-emerald-400'
                            : item.result === 'loss'
                            ? 'text-red-400'
                            : 'text-slate-300'
                        }
                      >
                        {item.result === 'win' ? 'Win' : item.result === 'loss' ? 'Loss' : 'Draw'} ({item.reason})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-xs text-slate-300">
                      {item.accuracy}%
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums text-xs font-semibold ${
                        item.eloDelta > 0
                          ? 'text-emerald-400'
                          : item.eloDelta < 0
                          ? 'text-red-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {item.eloDelta > 0 ? `+${item.eloDelta}` : item.eloDelta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
