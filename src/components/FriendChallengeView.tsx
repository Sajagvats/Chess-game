import React, { useState } from 'react';
import { Check, Copy, Link2, Swords, Users } from 'lucide-react';
import { TIME_CONTROLS } from '../data/rivals';
import { ArenaChatMessage, FriendChatMessage } from '../types/chess';
import { LiveChatPanel } from './LiveChatPanel';

interface FriendChallengeViewProps {
  playerId: string;
  playerName: string;
  playerElo: number;
  activeRoomCode: string | null;
  onCreateRoom: (timeControlId: string, side: 'w' | 'b' | 'random') => void;
  onJoinRoom: (code: string) => void;
  joinError: string | null;
  wsConnected: boolean;
  onlineCount: number;
  globalMessages: ArenaChatMessage[];
  roomMessages: FriendChatMessage[];
  onSendGlobalChat: (text: string) => void;
  onSendRoomChat: (text: string) => void;
  onReconnectWs: () => void;
}

export const FriendChallengeView: React.FC<FriendChallengeViewProps> = ({
  playerId,
  playerName,
  playerElo,
  activeRoomCode,
  onCreateRoom,
  onJoinRoom,
  joinError,
  wsConnected,
  onlineCount,
  globalMessages,
  roomMessages,
  onSendGlobalChat,
  onSendRoomChat,
  onReconnectWs,
}) => {
  const [timeControlId, setTimeControlId] = useState('3+2');
  const [side, setSide] = useState<'w' | 'b' | 'random'>('random');
  const [joinCode, setJoinCode] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const inviteUrl = activeRoomCode
    ? `${window.location.origin}${window.location.pathname}?room=${activeRoomCode}`
    : '';

  const handleCopyInvite = () => {
    if (!inviteUrl) return;
    navigator.clipboard?.writeText(inviteUrl).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="pb-5 border-b border-amber-400/20 space-y-2">
        <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
          <Users className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Live WebSocket Challenge Rooms</span>
          <span aria-hidden="true">·</span>
          <span>{playerName} ({playerElo} Elo)</span>
        </div>
        <h1
          className="text-2xl sm:text-4xl font-bold text-amber-50 tracking-tight"
          style={{ fontFamily: 'var(--font-display)', textWrap: 'balance' }}
        >
          Challenge Friends & Open Rivals
        </h1>
        <p className="text-sm text-amber-100/80">
          Create a private challenge link to play live against any friend in 3D or 2D, or enter a room code to accept an open challenge.
        </p>
      </div>

      {activeRoomCode && (
        <div className="p-5 rounded-xl bg-amber-500/15 border border-amber-400/45 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-amber-300">
              Active Room Code: <span className="font-mono text-sm">{activeRoomCode}</span>
            </div>
            <p className="text-xs text-amber-100/85 break-all font-mono">{inviteUrl}</p>
          </div>
          <button
            type="button"
            onClick={handleCopyInvite}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-xs font-bold transition-colors whitespace-nowrap shrink-0"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Invite Link Copied' : 'Copy Challenge Link'}</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Challenge Card */}
        <div className="p-6 rounded-2xl bg-[#241005]/95 border border-amber-400/25 space-y-5 shadow-xl">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-amber-50">Create Friend Challenge</h2>
            <p className="text-xs text-amber-200/75">
              Generate a real-time room code & invite link to send to anyone.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-amber-200/80 block">Time Control</label>
            <div className="grid grid-cols-4 gap-2">
              {TIME_CONTROLS.filter((tc) => ['1+0', '3+2', '5+0', '10+0'].includes(tc.id)).map(
                (tc) => (
                  <button
                    key={tc.id}
                    type="button"
                    onClick={() => setTimeControlId(tc.id)}
                    className={`py-2 px-2 rounded-md border text-center transition-colors ${
                      timeControlId === tc.id
                        ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                        : 'bg-[#180a03] border-amber-400/15 text-amber-100/80 hover:border-amber-400/40'
                    }`}
                  >
                    <div className="text-xs font-mono font-bold">{tc.label}</div>
                    <div className="text-[10px] text-amber-200/70">{tc.category}</div>
                  </button>
                )
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs text-amber-200/80 block">Your Color</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  { id: 'w', label: 'White' },
                  { id: 'random', label: 'Random' },
                  { id: 'b', label: 'Black' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSide(opt.id)}
                  className={`py-2 px-3 rounded-md border text-xs font-medium transition-colors ${
                    side === opt.id
                      ? 'bg-amber-500/25 border-amber-400 text-amber-50'
                      : 'bg-[#180a03] border-amber-400/15 text-amber-200/75 hover:text-amber-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => onCreateRoom(timeControlId, side)}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors"
          >
            <Link2 className="w-4 h-4" aria-hidden="true" />
            <span>Create Challenge & Open Board</span>
          </button>
        </div>

        {/* Join Challenge Card */}
        <div className="p-6 rounded-2xl bg-[#241005]/95 border border-amber-400/25 space-y-5 flex flex-col justify-between shadow-xl">
          <div className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-amber-50">Join Friend by Code</h2>
              <p className="text-xs text-amber-200/75">
                Enter the room code shared by your friend (for example, GM-4K9P).
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs text-amber-200/80 block">Room Code</label>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && joinCode.trim()) onJoinRoom(joinCode.trim());
                }}
                placeholder="GM-XXXX"
                className="w-full px-4 py-3 rounded-lg bg-[#180a03] border border-amber-400/25 text-base font-mono uppercase tracking-wider text-amber-50 placeholder:text-amber-200/35 focus:outline-none focus:border-amber-400"
              />
            </div>

            {joinError && (
              <div className="p-3 rounded-lg bg-red-950/65 border border-red-400/45 text-xs text-red-100">
                {joinError}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => joinCode.trim() && onJoinRoom(joinCode.trim())}
            disabled={!joinCode.trim()}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-[#180a03] hover:bg-[#311507] disabled:opacity-50 border border-amber-400/25 text-amber-50 text-sm font-semibold transition-colors"
          >
            <Swords className="w-4 h-4 text-amber-300" aria-hidden="true" />
            <span>Join Challenge Room</span>
          </button>
        </div>
      </div>

      {/* Live Arena Lobby & Room Chat */}
      <LiveChatPanel
        connected={wsConnected}
        onlineCount={onlineCount}
        currentPlayerId={playerId}
        globalMessages={globalMessages}
        roomCode={activeRoomCode}
        roomMessages={roomMessages}
        defaultChannel="global"
        onSendGlobal={onSendGlobalChat}
        onSendRoom={onSendRoomChat}
        onReconnect={onReconnectWs}
      />
    </div>
  );
};
