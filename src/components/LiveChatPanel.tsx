import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Users, Wifi, WifiOff } from 'lucide-react';
import { ArenaChatMessage, FriendChatMessage } from '../types/chess';

interface LiveChatPanelProps {
  connected: boolean;
  onlineCount: number;
  currentPlayerId: string;
  globalMessages: ArenaChatMessage[];
  roomCode: string | null;
  roomMessages: FriendChatMessage[];
  defaultChannel?: 'global' | 'room';
  onSendGlobal: (text: string) => void;
  onSendRoom?: (text: string) => void;
  onReconnect: () => void;
  compact?: boolean;
}

const QUICK_CHIPS = ['Good luck!', 'Nice move!', 'GG!', 'Play me?'];

function formatTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export const LiveChatPanel: React.FC<LiveChatPanelProps> = ({
  connected,
  onlineCount,
  currentPlayerId,
  globalMessages,
  roomCode,
  roomMessages,
  defaultChannel = 'global',
  onSendGlobal,
  onSendRoom,
  onReconnect,
  compact = false,
}) => {
  const [channel, setChannel] = useState<'global' | 'room'>(
    roomCode && defaultChannel === 'room' ? 'room' : 'global'
  );
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (roomCode && defaultChannel === 'room') {
      setChannel('room');
    } else if (!roomCode && channel === 'room') {
      setChannel('global');
    }
  }, [channel, defaultChannel, roomCode]);

  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [channel, globalMessages.length, roomMessages.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    if (channel === 'room' && roomCode && onSendRoom) {
      onSendRoom(trimmed);
    } else {
      onSendGlobal(trimmed);
    }
    setText('');
  };

  const handleQuickChip = (chip: string) => {
    if (!connected) return;
    if (channel === 'room' && roomCode && onSendRoom) {
      onSendRoom(chip);
    } else {
      onSendGlobal(chip);
    }
  };

  const handleShareRoomInvite = () => {
    if (!roomCode || !connected) return;
    onSendGlobal(`Open Challenge! Join my room ${roomCode}`);
  };

  return (
    <div className="rounded-xl bg-[#241005]/95 border border-amber-400/25 overflow-hidden flex flex-col shadow-xl">
      {/* Header Bar */}
      <div className="px-3.5 py-2.5 border-b border-amber-400/20 bg-[#1c0c04] flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <MessageSquare className="w-3.5 h-3.5 text-amber-300 shrink-0" aria-hidden="true" />
          <span className="text-xs font-semibold text-amber-50 truncate">Live Arena Chat</span>
          <span className="inline-flex items-center gap-1 text-[11px] text-amber-200/75 font-mono tabular-nums">
            <Users className="w-3 h-3 text-emerald-300" aria-hidden="true" />
            {onlineCount} online
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {roomCode && (
            <div className="flex items-center p-0.5 rounded bg-[#140802] border border-amber-400/20">
              <button
                type="button"
                onClick={() => setChannel('room')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  channel === 'room'
                    ? 'bg-amber-400 text-stone-950 font-semibold'
                    : 'text-amber-200/75 hover:text-amber-50'
                }`}
              >
                Room
              </button>
              <button
                type="button"
                onClick={() => setChannel('global')}
                className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                  channel === 'global'
                    ? 'bg-amber-400 text-stone-950 font-semibold'
                    : 'text-amber-200/75 hover:text-amber-50'
                }`}
              >
                Global
              </button>
            </div>
          )}

          {connected ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-emerald-300"
              title="Connected via WebSocket"
            >
              <Wifi className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Live</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={onReconnect}
              className="inline-flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 underline"
            >
              <WifiOff className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Reconnect</span>
            </button>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div
        ref={listRef}
        className={`${
          compact ? 'h-36' : 'h-48'
        } overflow-y-auto arena-scroll p-3 space-y-2 bg-[#180a03]`}
      >
        {channel === 'room' && roomCode ? (
          roomMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-amber-200/60 text-center px-3">
              Private room chat ({roomCode}) is live. Say hello to your opponent.
            </div>
          ) : (
            roomMessages.map((msg) => (
              <div key={msg.id} className="text-xs leading-relaxed">
                <span className="text-[10px] font-mono text-amber-200/50 mr-1.5">
                  {formatTime(msg.ts)}
                </span>
                <span className="font-semibold text-amber-300">{msg.sender}: </span>
                <span className="text-amber-50 break-words">{msg.text}</span>
              </div>
            ))
          )
        ) : globalMessages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-amber-200/60 text-center px-3">
            Live WebSocket arena chat is connected. Send a message or challenge players online!
          </div>
        ) : (
          globalMessages.map((msg) => {
            const isMe = msg.senderId === currentPlayerId;
            return (
              <div key={msg.id} className="text-xs leading-relaxed">
                <span className="text-[10px] font-mono text-amber-200/50 mr-1.5">
                  {formatTime(msg.ts)}
                </span>
                <span
                  className={`font-semibold ${
                    isMe ? 'text-emerald-300' : 'text-amber-300'
                  }`}
                >
                  {msg.senderName}
                </span>
                <span className="text-[10px] font-mono text-amber-200/55 ml-1 mr-1.5">
                  ({msg.senderElo})
                </span>
                <span className="text-amber-50 break-words">{msg.text}</span>
              </div>
            );
          })
        )}
      </div>

      {/* Quick Chips & Input */}
      <div className="p-2.5 border-t border-amber-400/20 bg-[#241005] space-y-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          {QUICK_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleQuickChip(chip)}
              disabled={!connected}
              className="px-2 py-0.5 rounded bg-[#180a03] hover:bg-[#311507] disabled:opacity-40 border border-amber-400/20 text-[11px] text-amber-100 whitespace-nowrap transition-colors"
            >
              {chip}
            </button>
          ))}
          {roomCode && channel === 'global' && (
            <button
              type="button"
              onClick={handleShareRoomInvite}
              disabled={!connected}
              className="px-2 py-0.5 rounded bg-amber-500/20 hover:bg-amber-500/30 disabled:opacity-40 border border-amber-400/40 text-[11px] text-amber-200 font-medium whitespace-nowrap transition-colors"
            >
              Post {roomCode}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex gap-1.5">
          <input
            type="text"
            value={text}
            maxLength={240}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              channel === 'room' && roomCode
                ? `Message Room ${roomCode}...`
                : 'Chat live with arena players...'
            }
            className="flex-1 min-w-0 px-3 py-1.5 rounded-lg bg-[#180a03] border border-amber-400/25 text-xs text-amber-50 placeholder:text-amber-200/45 focus:outline-none focus:border-amber-400"
          />
          <button
            type="submit"
            disabled={!connected || !text.trim()}
            className="inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 disabled:opacity-40 text-stone-950 text-xs font-bold transition-colors shrink-0"
            aria-label="Send chat message"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
