import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { Chess } from 'chess.js';
import { requireAuth, type AuthRequest } from './src/middleware/auth.ts';
import {
  executeWalletMutation,
  getUserAccountSnapshot,
  insertMoradabadInstitutionToDb,
  listLeagueEntriesFromDb,
  listMoradabadInstitutionsFromDb,
  listRecentMatchesFromDb,
  recordMatchHistoryToDb,
  updateLeagueStandingInDb,
  updateUserProfileStats,
  upsertLeagueEntryToDb,
} from './src/db/repository.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type PlayerColor = 'w' | 'b';

interface RoomPlayer {
  id: string;
  name: string;
  elo: number;
  connected: boolean;
}

interface ChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
}

interface MoveRecordServer {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  san: string;
  from: string;
  to: string;
  fenAfter: string;
}

type MoradabadDivision = 'school' | 'college' | 'company';

function parseMoradabadDivision(val: unknown): MoradabadDivision {
  if (val === 'college') return 'college';
  if (val === 'company') return 'company';
  return 'school';
}

function getMoradabadTitle(division: MoradabadDivision): string {
  if (division === 'school') return 'Moradabad School Chess League (Uttar Pradesh)';
  if (division === 'college') return 'Moradabad College Chess League (Uttar Pradesh)';
  return 'Moradabad Companies Chess League (Uttar Pradesh)';
}

function getMoradabadShortTitle(division: MoradabadDivision): string {
  if (division === 'school') return 'Moradabad School Chess League (UP)';
  if (division === 'college') return 'Moradabad College Chess League (UP)';
  return 'Moradabad Companies Chess League (UP)';
}

function getMoradabadNoun(division: MoradabadDivision): string {
  if (division === 'school') return 'School';
  if (division === 'college') return 'College';
  return 'Company';
}

interface RoomLeagueMeta {
  kind?: 'world' | 'moradabad';
  division?: MoradabadDivision;
  leagueTitle: string;
  whiteInstitution?: string;
  blackInstitution?: string;
}

interface WorldLivePlayer {
  playerId: string;
  name: string;
  elo: number;
  tierId: 'normal' | 'hard' | 'hardcore' | 'expert';
  entryFeePaid: number;
  online: boolean;
  waitingForMatch: boolean;
  inRoomCode: string | null;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  matchesPlayed: number;
  joinedAt: string;
}

interface WorldLiveMatch {
  id: string;
  whiteName: string;
  blackName: string;
  winner: PlayerColor | 'draw';
  reason: string;
  finishedAt: string;
}

interface MoradabadInstitution {
  id: string;
  passCode: string;
  division: MoradabadDivision;
  name: string;
  city: string;
  coordinatorName: string;
  feePaid: number;
  paymentMethod: string;
  studentSeats: number;
  registeredAt: string;
}

interface MoradabadLeaguePlayer {
  playerId: string;
  name: string;
  elo: number;
  division: MoradabadDivision;
  institutionId: string;
  institutionName: string;
  online: boolean;
  waitingForMatch: boolean;
  inRoomCode: string | null;
  wins: number;
  draws: number;
  losses: number;
  points: number;
  matchesPlayed: number;
  joinedAt: string;
}

interface MoradabadRecentMatch {
  id: string;
  division: MoradabadDivision;
  whiteName: string;
  whiteInstitution: string;
  blackName: string;
  blackInstitution: string;
  winner: PlayerColor | 'draw';
  reason: string;
  finishedAt: string;
}

interface ChessRoom {
  code: string;
  createdAt: number;
  timeControlId: string;
  initialMs: number;
  incrementMs: number;
  hostColorPref: 'w' | 'b' | 'random';
  chess: Chess;
  moves: MoveRecordServer[];
  white: RoomPlayer | null;
  black: RoomPlayer | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  lastMoveTimestamp: number;
  status: 'waiting' | 'playing' | 'finished';
  winner: PlayerColor | 'draw' | null;
  reason: string | null;
  drawOfferBy: PlayerColor | null;
  rematchVotes: string[];
  chat: ChatMessage[];
  clients: Map<WebSocket, { playerId: string }>;
  leagueMeta: RoomLeagueMeta | null;
  leagueRecorded: boolean;
}

const TIME_CONTROL_MAP: Record<string, { initialMs: number; incrementMs: number }> = {
  '1+0': { initialMs: 60_000, incrementMs: 0 },
  '2+1': { initialMs: 120_000, incrementMs: 1_000 },
  '3+0': { initialMs: 180_000, incrementMs: 0 },
  '3+2': { initialMs: 180_000, incrementMs: 2_000 },
  '5+0': { initialMs: 300_000, incrementMs: 0 },
  '10+0': { initialMs: 600_000, incrementMs: 0 },
  '15+10': { initialMs: 900_000, incrementMs: 10_000 },
};

const MORADABAD_MANAGEMENT_FEE = 10000;
const WORLD_PRIZE_POOL = 50000;
const WORLD_PRIZES = { first: 25000, second: 16667, third: 8333 };
const WORLD_TIER_FEES: Record<'normal' | 'hard' | 'hardcore' | 'expert', number> = {
  normal: 500,
  hard: 1000,
  hardcore: 2000,
  expert: 3000,
};

interface ServerWalletTx {
  id: string;
  type: 'deposit' | 'withdraw' | 'entry_fee' | 'prize';
  method: string;
  referenceId: string;
  amount: number;
  timestampIso: string;
  note: string;
}

interface ServerWalletAccount {
  balance: number;
  transactions: ServerWalletTx[];
}

const serverWallets = new Map<string, ServerWalletAccount>();
const processedIdempotencyKeys = new Map<string, { ok: true; transaction: ServerWalletTx; balance: number }>();

function getOrCreateWallet(playerId: string, seedBalance = 500): ServerWalletAccount {
  const cleanId = playerId || 'default';
  let wallet = serverWallets.get(cleanId);
  if (!wallet) {
    wallet = {
      balance: Math.max(0, Math.round(seedBalance)),
      transactions: [
        {
          id: 'WELCOME-500',
          type: 'deposit',
          method: 'Starter Bonus',
          referenceId: 'BONUS-ARENA',
          amount: 500,
          timestampIso: new Date().toISOString(),
          note: 'Welcome Tournament Credits',
        },
      ],
    };
    serverWallets.set(cleanId, wallet);
  }
  return wallet;
}

interface ArenaChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderElo: number;
  text: string;
  ts: number;
}

const rooms = new Map<string, ChessRoom>();
const globalChat: ArenaChatMessage[] = [];
const onlineClients = new Map<WebSocket, { playerId: string; name: string; elo: number }>();

const moradabadInstitutions: Record<MoradabadDivision, MoradabadInstitution[]> = {
  school: [],
  college: [],
  company: [],
};
const moradabadPlayers: Record<MoradabadDivision, Map<string, MoradabadLeaguePlayer>> = {
  school: new Map(),
  college: new Map(),
  company: new Map(),
};
const moradabadRecentMatches: Record<MoradabadDivision, MoradabadRecentMatch[]> = {
  school: [],
  college: [],
  company: [],
};
const moradabadSettled: Record<MoradabadDivision, boolean> = {
  school: false,
  college: false,
  company: false,
};

const worldLeaguePlayers = new Map<string, WorldLivePlayer>();
const worldLeagueMatches: WorldLiveMatch[] = [];
let worldLeagueSettled = false;

let sqlHydrated = false;
let sqlHydrationPromise: Promise<void> | null = null;

async function ensureHydratedFromSql() {
  if (sqlHydrated) return;
  if (sqlHydrationPromise) return sqlHydrationPromise;

  sqlHydrationPromise = (async () => {
    try {
      const [instRows, entryRows, matchRows] = await Promise.all([
        listMoradabadInstitutionsFromDb(),
        listLeagueEntriesFromDb(),
        listRecentMatchesFromDb(),
      ]);

      for (const row of instRows) {
        const div = parseMoradabadDivision(row.division);
        if (!moradabadInstitutions[div].some((i) => i.id === row.id)) {
          moradabadInstitutions[div].push({
            id: row.id,
            passCode: row.passCode,
            division: div,
            name: row.name,
            city: row.city,
            coordinatorName: row.coordinatorName,
            feePaid: row.feePaid,
            paymentMethod: row.paymentMethod,
            studentSeats: row.studentSeats,
            registeredAt: row.registeredAt.toISOString(),
          });
        }
      }

      for (const row of entryRows) {
        if (row.leagueKind === 'world') {
          if (!worldLeaguePlayers.has(row.playerId)) {
            worldLeaguePlayers.set(row.playerId, {
              playerId: row.playerId,
              name: row.playerName,
              elo: row.elo,
              tierId:
                row.tierId === 'hard' || row.tierId === 'hardcore' || row.tierId === 'expert'
                  ? row.tierId
                  : 'normal',
              entryFeePaid: row.entryFeePaid,
              online: isPlayerOnline(row.playerId),
              waitingForMatch: false,
              inRoomCode: null,
              wins: row.wins,
              draws: row.draws,
              losses: row.losses,
              points: row.points,
              matchesPlayed: row.matchesPlayed,
              joinedAt: row.joinedAt.toISOString(),
            });
          }
        } else if (row.leagueKind.startsWith('moradabad_')) {
          const div = parseMoradabadDivision(row.leagueKind.replace('moradabad_', ''));
          if (!moradabadPlayers[div].has(row.playerId)) {
            moradabadPlayers[div].set(row.playerId, {
              playerId: row.playerId,
              name: row.playerName,
              elo: row.elo,
              division: div,
              institutionId: row.institutionId || '',
              institutionName: row.institutionName || 'Moradabad',
              online: isPlayerOnline(row.playerId),
              waitingForMatch: false,
              inRoomCode: null,
              wins: row.wins,
              draws: row.draws,
              losses: row.losses,
              points: row.points,
              matchesPlayed: row.matchesPlayed,
              joinedAt: row.joinedAt.toISOString(),
            });
          }
        }
      }

      for (const m of matchRows) {
        const w: PlayerColor | 'draw' = m.winner === 'w' ? 'w' : m.winner === 'b' ? 'b' : 'draw';
        if (m.leagueKind === 'world') {
          if (!worldLeagueMatches.some((existing) => existing.id === m.matchUid)) {
            worldLeagueMatches.push({
              id: m.matchUid,
              whiteName: m.whiteName,
              blackName: m.blackName,
              winner: w,
              reason: m.reason,
              finishedAt: m.playedAt.toISOString(),
            });
          }
        } else if (m.leagueKind.startsWith('moradabad_')) {
          const div = parseMoradabadDivision(m.leagueKind.replace('moradabad_', ''));
          if (!moradabadRecentMatches[div].some((existing) => existing.id === m.matchUid)) {
            moradabadRecentMatches[div].push({
              id: m.matchUid,
              division: div,
              whiteName: m.whiteName,
              whiteInstitution: m.whiteInstitution || 'Moradabad',
              blackName: m.blackName,
              blackInstitution: m.blackInstitution || 'Moradabad',
              winner: w,
              reason: m.reason,
              finishedAt: m.playedAt.toISOString(),
            });
          }
        }
      }

      sqlHydrated = true;
    } catch (err) {
      console.error('Lazy SQL hydration failed:', err);
    } finally {
      sqlHydrationPromise = null;
    }
  })();

  return sqlHydrationPromise;
}

function serializeWorldState() {
  const players = [...worldLeaguePlayers.values()]
    .map((p) => ({
      ...p,
      online: isPlayerOnline(p.playerId),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      return b.elo - a.elo;
    });

  return {
    title: 'World Chess League Championship',
    maxPlayers: 50,
    prizePool: WORLD_PRIZE_POOL,
    prizes: WORLD_PRIZES,
    players,
    recentMatches: worldLeagueMatches.slice(0, 20),
    payoutSettled: worldLeagueSettled,
  };
}

function broadcastWorldState(wss: WebSocketServer) {
  broadcastAll(wss, {
    type: 'world:state',
    worldLeague: serializeWorldState(),
  });
}

function isPlayerOnline(playerId: string): boolean {
  for (const [ws, info] of onlineClients.entries()) {
    if (ws.readyState === WebSocket.OPEN && info.playerId === playerId) {
      return true;
    }
  }
  return false;
}

function getSocketsForPlayer(playerId: string): WebSocket[] {
  const matched: WebSocket[] = [];
  for (const [ws, info] of onlineClients.entries()) {
    if (ws.readyState === WebSocket.OPEN && info.playerId === playerId) {
      matched.push(ws);
    }
  }
  return matched;
}

function computeMoradabadPrizes(pool: number) {
  if (pool <= 0) {
    return { first: 0, second: 0, third: 0 };
  }
  const first = Math.round((pool * 3) / 6);
  const second = Math.round((pool * 2) / 6);
  const third = Math.max(0, pool - first - second);
  return { first, second, third };
}

function serializeMoradabadDivision(division: MoradabadDivision) {
  const institutions = moradabadInstitutions[division];
  const prizePool = institutions.reduce((sum, inst) => sum + inst.feePaid, 0);
  const players = [...moradabadPlayers[division].values()]
    .map((p) => ({
      ...p,
      online: isPlayerOnline(p.playerId),
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.wins !== a.wins) return b.wins - a.wins;
      if (b.matchesPlayed !== a.matchesPlayed) return b.matchesPlayed - a.matchesPlayed;
      return b.elo - a.elo;
    });

  return {
    division,
    title: getMoradabadTitle(division),
    city: 'Moradabad, Uttar Pradesh',
    managementFeePerInstitution: MORADABAD_MANAGEMENT_FEE,
    studentEntryFee: 0,
    prizePool,
    prizes: computeMoradabadPrizes(prizePool),
    institutions,
    players,
    recentMatches: moradabadRecentMatches[division].slice(0, 20),
    payoutSettled: moradabadSettled[division],
  };
}

function serializeMoradabadState() {
  return {
    school: serializeMoradabadDivision('school'),
    college: serializeMoradabadDivision('college'),
    company: serializeMoradabadDivision('company'),
  };
}

function broadcastMoradabadState(wss: WebSocketServer) {
  broadcastAll(wss, {
    type: 'moradabad:state',
    leagues: serializeMoradabadState(),
  });
}

function getUniqueOnlineCount(): number {
  const ids = new Set<string>();
  for (const [ws, info] of onlineClients.entries()) {
    if (ws.readyState === WebSocket.OPEN && info.playerId) {
      ids.add(info.playerId);
    }
  }
  return Math.max(ids.size, [...onlineClients.keys()].filter((ws) => ws.readyState === WebSocket.OPEN).length > 0 ? 1 : 0);
}

function broadcastAll(wss: WebSocketServer, payloadObj: unknown) {
  const payload = JSON.stringify(payloadObj);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  const code = `GM-${suffix}`;
  return rooms.has(code) ? generateRoomCode() : code;
}

function getLiveClocks(room: ChessRoom): { whiteTimeMs: number; blackTimeMs: number } {
  let w = room.whiteTimeMs;
  let b = room.blackTimeMs;
  if (room.status === 'playing' && room.moves.length > 0) {
    const elapsed = Math.max(0, Date.now() - room.lastMoveTimestamp);
    if (room.chess.turn() === 'w') {
      w = Math.max(0, w - elapsed);
    } else {
      b = Math.max(0, b - elapsed);
    }
  }
  return { whiteTimeMs: w, blackTimeMs: b };
}

function serializeRoom(room: ChessRoom) {
  const clocks = getLiveClocks(room);
  return {
    code: room.code,
    timeControlId: room.timeControlId,
    fen: room.chess.fen(),
    pgn: room.chess.pgn(),
    turn: room.chess.turn(),
    moves: room.moves,
    white: room.white,
    black: room.black,
    whiteTimeMs: clocks.whiteTimeMs,
    blackTimeMs: clocks.blackTimeMs,
    status: room.status,
    winner: room.winner,
    reason: room.reason,
    drawOfferBy: room.drawOfferBy,
    rematchVotes: room.rematchVotes,
    chat: room.chat.slice(-40),
    leagueMeta: room.leagueMeta,
  };
}

function broadcastRoom(room: ChessRoom) {
  const payload = JSON.stringify({
    type: 'room:state',
    room: serializeRoom(room),
  });
  for (const ws of room.clients.keys()) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

function createRoomRecord(
  timeControlId: string,
  hostColorPref: 'w' | 'b' | 'random',
  leagueMeta: RoomLeagueMeta | null = null
): ChessRoom {
  const tc = TIME_CONTROL_MAP[timeControlId] ?? TIME_CONTROL_MAP['3+2'];
  const code = generateRoomCode();
  const room: ChessRoom = {
    code,
    createdAt: Date.now(),
    timeControlId: TIME_CONTROL_MAP[timeControlId] ? timeControlId : '3+2',
    initialMs: tc.initialMs,
    incrementMs: tc.incrementMs,
    hostColorPref,
    chess: new Chess(),
    moves: [],
    white: null,
    black: null,
    whiteTimeMs: tc.initialMs,
    blackTimeMs: tc.initialMs,
    lastMoveTimestamp: Date.now(),
    status: 'waiting',
    winner: null,
    reason: null,
    drawOfferBy: null,
    rematchVotes: [],
    chat: [],
    clients: new Map(),
    leagueMeta,
    leagueRecorded: false,
  };
  rooms.set(code, room);
  return room;
}

function finalizeMoradabadRoomMatch(room: ChessRoom, wss: WebSocketServer) {
  if (!room.leagueMeta || room.leagueRecorded || room.status !== 'finished' || !room.winner) {
    return;
  }
  room.leagueRecorded = true;

  if (room.leagueMeta.kind === 'world') {
    const whiteEntry = room.white ? worldLeaguePlayers.get(room.white.id) : undefined;
    const blackEntry = room.black ? worldLeaguePlayers.get(room.black.id) : undefined;

    if (whiteEntry) {
      whiteEntry.matchesPlayed += 1;
      whiteEntry.inRoomCode = null;
      whiteEntry.waitingForMatch = false;
      if (room.winner === 'w') {
        whiteEntry.wins += 1;
        whiteEntry.points += 3;
      } else if (room.winner === 'draw') {
        whiteEntry.draws += 1;
        whiteEntry.points += 1;
      } else {
        whiteEntry.losses += 1;
      }
    }

    if (blackEntry) {
      blackEntry.matchesPlayed += 1;
      blackEntry.inRoomCode = null;
      blackEntry.waitingForMatch = false;
      if (room.winner === 'b') {
        blackEntry.wins += 1;
        blackEntry.points += 3;
      } else if (room.winner === 'draw') {
        blackEntry.draws += 1;
        blackEntry.points += 1;
      } else {
        blackEntry.losses += 1;
      }
    }

    const matchId = `wld-m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    const whiteName = room.white?.name || 'Player White';
    const blackName = room.black?.name || 'Player Black';

    worldLeagueMatches.unshift({
      id: matchId,
      whiteName,
      blackName,
      winner: room.winner,
      reason: room.reason || 'completed',
      finishedAt: new Date().toISOString(),
    });
    if (worldLeagueMatches.length > 25) {
      worldLeagueMatches.length = 25;
    }

    if (whiteEntry) {
      updateLeagueStandingInDb({
        leagueKind: 'world',
        playerId: whiteEntry.playerId,
        winInc: room.winner === 'w' ? 1 : 0,
        drawInc: room.winner === 'draw' ? 1 : 0,
        lossInc: room.winner === 'b' ? 1 : 0,
        pointsInc: room.winner === 'w' ? 3 : room.winner === 'draw' ? 1 : 0,
      }).catch((e) => console.error('Failed to persist white world standing:', e));
    }
    if (blackEntry) {
      updateLeagueStandingInDb({
        leagueKind: 'world',
        playerId: blackEntry.playerId,
        winInc: room.winner === 'b' ? 1 : 0,
        drawInc: room.winner === 'draw' ? 1 : 0,
        lossInc: room.winner === 'w' ? 1 : 0,
        pointsInc: room.winner === 'b' ? 3 : room.winner === 'draw' ? 1 : 0,
      }).catch((e) => console.error('Failed to persist black world standing:', e));
    }
    recordMatchHistoryToDb({
      matchUid: matchId,
      leagueKind: 'world',
      whiteName,
      blackName,
      winner: room.winner,
      reason: room.reason || 'completed',
      movesCount: Math.ceil(room.moves.length / 2),
    }).catch((e) => console.error('Failed to persist world match:', e));

    broadcastWorldState(wss);
    return;
  }

  const division = room.leagueMeta.division || 'school';
  const playersMap = moradabadPlayers[division];

  const whiteEntry = room.white ? playersMap.get(room.white.id) : undefined;
  const blackEntry = room.black ? playersMap.get(room.black.id) : undefined;

  if (whiteEntry) {
    whiteEntry.matchesPlayed += 1;
    whiteEntry.inRoomCode = null;
    whiteEntry.waitingForMatch = false;
    if (room.winner === 'w') {
      whiteEntry.wins += 1;
      whiteEntry.points += 3;
    } else if (room.winner === 'draw') {
      whiteEntry.draws += 1;
      whiteEntry.points += 1;
    } else {
      whiteEntry.losses += 1;
    }
  }

  if (blackEntry) {
    blackEntry.matchesPlayed += 1;
    blackEntry.inRoomCode = null;
    blackEntry.waitingForMatch = false;
    if (room.winner === 'b') {
      blackEntry.wins += 1;
      blackEntry.points += 3;
    } else if (room.winner === 'draw') {
      blackEntry.draws += 1;
      blackEntry.points += 1;
    } else {
      blackEntry.losses += 1;
    }
  }

  const mbdMatchId = `mbd-m-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
  const whiteInst = room.leagueMeta.whiteInstitution || whiteEntry?.institutionName || 'Moradabad';
  const blackInst = room.leagueMeta.blackInstitution || blackEntry?.institutionName || 'Moradabad';

  moradabadRecentMatches[division].unshift({
    id: mbdMatchId,
    division,
    whiteName: room.white?.name || 'Player White',
    whiteInstitution: whiteInst,
    blackName: room.black?.name || 'Player Black',
    blackInstitution: blackInst,
    winner: room.winner,
    reason: room.reason || 'completed',
    finishedAt: new Date().toISOString(),
  });
  if (moradabadRecentMatches[division].length > 25) {
    moradabadRecentMatches[division].length = 25;
  }

  const leagueKind = `moradabad_${division}`;
  if (whiteEntry) {
    updateLeagueStandingInDb({
      leagueKind,
      playerId: whiteEntry.playerId,
      winInc: room.winner === 'w' ? 1 : 0,
      drawInc: room.winner === 'draw' ? 1 : 0,
      lossInc: room.winner === 'b' ? 1 : 0,
      pointsInc: room.winner === 'w' ? 3 : room.winner === 'draw' ? 1 : 0,
    }).catch((e) => console.error('Failed to persist Moradabad white standing:', e));
  }
  if (blackEntry) {
    updateLeagueStandingInDb({
      leagueKind,
      playerId: blackEntry.playerId,
      winInc: room.winner === 'b' ? 1 : 0,
      drawInc: room.winner === 'draw' ? 1 : 0,
      lossInc: room.winner === 'w' ? 1 : 0,
      pointsInc: room.winner === 'b' ? 3 : room.winner === 'draw' ? 1 : 0,
    }).catch((e) => console.error('Failed to persist Moradabad black standing:', e));
  }
  recordMatchHistoryToDb({
    matchUid: mbdMatchId,
    leagueKind,
    whiteName: room.white?.name || 'Player White',
    blackName: room.black?.name || 'Player Black',
    whiteInstitution: whiteInst,
    blackInstitution: blackInst,
    winner: room.winner,
    reason: room.reason || 'completed',
    movesCount: Math.ceil(room.moves.length / 2),
  }).catch((e) => console.error('Failed to persist Moradabad match:', e));

  broadcastMoradabadState(wss);
}

function assignPlayerToRoom(
  room: ChessRoom,
  playerId: string,
  name: string,
  elo: number
): void {
  if (room.white?.id === playerId) {
    room.white.connected = true;
    room.white.name = name;
    room.white.elo = elo;
    return;
  }
  if (room.black?.id === playerId) {
    room.black.connected = true;
    room.black.name = name;
    room.black.elo = elo;
    return;
  }

  const playerObj: RoomPlayer = {
    id: playerId,
    name: name.slice(0, 24) || 'Challenger',
    elo: Number.isFinite(elo) ? elo : 1200,
    connected: true,
  };

  if (!room.white && !room.black) {
    let hostIsWhite = true;
    if (room.hostColorPref === 'b') hostIsWhite = false;
    else if (room.hostColorPref === 'random') hostIsWhite = Math.random() < 0.5;

    if (hostIsWhite) room.white = playerObj;
    else room.black = playerObj;
  } else if (!room.white) {
    room.white = playerObj;
  } else if (!room.black) {
    room.black = playerObj;
  }

  if (room.white && room.black && room.status === 'waiting') {
    room.status = 'playing';
    room.lastMoveTimestamp = Date.now();
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  app.get('/health', (_req, res) => {
    res.json({ ok: true, activeRooms: rooms.size });
  });

  app.post('/api/rooms', (req, res) => {
    const timeControlId = typeof req.body?.timeControlId === 'string' ? req.body.timeControlId : '3+2';
    const hostColorPref =
      req.body?.hostColorPref === 'b' || req.body?.hostColorPref === 'random'
        ? req.body.hostColorPref
        : 'w';
    const room = createRoomRecord(timeControlId, hostColorPref);
    res.json({ code: room.code, room: serializeRoom(room) });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = req.params.code.toUpperCase().trim();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Challenge room not found' });
      return;
    }
    res.json({ room: serializeRoom(room) });
  });

  app.get('/api/wallet/config', (_req, res) => {
    const gatewayConfigured = Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET
    );
    res.json({
      ok: true,
      gatewayMode: gatewayConfigured ? 'razorpay_live' : 'sandbox_verified',
      merchantUpi: process.env.MERCHANT_UPI_ID || null,
    });
  });

  app.get('/api/account/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const snapshot = await getUserAccountSnapshot(req.user!.uid);
      if (!snapshot) {
        res.status(404).json({ error: 'Account not found.' });
        return;
      }
      res.json({
        ok: true,
        user: {
          uid: snapshot.user.uid,
          email: snapshot.user.email,
          name: snapshot.user.displayName,
          elo: snapshot.user.elo,
          peakElo: snapshot.user.peakElo,
          wins: snapshot.user.wins,
          losses: snapshot.user.losses,
          draws: snapshot.user.draws,
          streak: snapshot.user.streak,
          trophies: snapshot.user.trophies,
          walletBalance: snapshot.user.walletBalance,
        },
        transactions: snapshot.transactions,
        history: snapshot.history.map((m) => ({
          id: m.matchUid,
          dateIso: m.playedAt.toISOString(),
          mode: m.leagueKind === 'arena' ? 'rated' : 'league',
          opponentName: m.blackName,
          opponentElo: 1200,
          playerColor: 'w',
          timeControlLabel: 'Standard',
          opening: m.opening,
          result: m.winner === 'w' ? 'win' : m.winner === 'draw' ? 'draw' : 'loss',
          reason: m.reason,
          eloDelta: m.eloDelta,
          movesCount: m.movesCount,
          accuracy: 92,
        })),
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Unable to load account.' });
    }
  });

  app.put('/api/account/profile', requireAuth, async (req: AuthRequest, res) => {
    try {
      const updated = await updateUserProfileStats(req.user!.uid, {
        displayName: req.body?.name,
        elo: req.body?.elo,
        peakElo: req.body?.peakElo,
        wins: req.body?.wins,
        losses: req.body?.losses,
        draws: req.body?.draws,
        streak: req.body?.streak,
        trophies: req.body?.trophies,
      });
      res.json({ ok: true, user: updated });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Unable to update profile.' });
    }
  });

  app.post('/api/account/matches', requireAuth, async (req: AuthRequest, res) => {
    try {
      const matchUid = String(req.body?.id || `solo-${Date.now()}`).slice(0, 64);
      const saved = await recordMatchHistoryToDb({
        matchUid,
        userUid: req.user!.uid,
        leagueKind: String(req.body?.mode || 'arena').slice(0, 32),
        whiteName: String(req.body?.whiteName || 'Challenger').slice(0, 48),
        blackName: String(req.body?.opponentName || 'Opponent').slice(0, 48),
        winner: req.body?.result === 'win' ? 'w' : req.body?.result === 'draw' ? 'draw' : 'b',
        reason: String(req.body?.reason || 'completed').slice(0, 32),
        opening: String(req.body?.opening || 'Standard Opening').slice(0, 64),
        movesCount: Number(req.body?.movesCount || 0),
        eloDelta: Number(req.body?.eloDelta || 0),
      });
      res.json({ ok: true, match: saved });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Unable to save match.' });
    }
  });

  app.get('/api/wallet/me', requireAuth, async (req: AuthRequest, res) => {
    try {
      const snapshot = await getUserAccountSnapshot(req.user!.uid);
      res.json({
        ok: true,
        balance: snapshot?.user.walletBalance ?? 500,
        transactions: snapshot?.transactions ?? [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Unable to load wallet.' });
    }
  });

  app.get('/api/wallet/:playerId', requireAuth, async (req: AuthRequest, res) => {
    try {
      const snapshot = await getUserAccountSnapshot(req.user!.uid);
      res.json({
        ok: true,
        balance: snapshot?.user.walletBalance ?? 500,
        transactions: snapshot?.transactions ?? [],
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Unable to load wallet.' });
    }
  });

  app.post('/api/wallet/deposit', requireAuth, async (req: AuthRequest, res) => {
    const idempotencyKey = String(req.body?.idempotencyKey || '').trim().slice(0, 64);
    const amount = Math.round(Number(req.body?.amount));
    const method = String(req.body?.method || 'UPI').trim();
    const detail = String(req.body?.detail || '').trim();

    if (!Number.isFinite(amount) || amount < 50 || amount > 100000) {
      res.status(400).json({ error: 'Deposit amount must be between ₹50 and ₹1,00,000.' });
      return;
    }
    if (!detail) {
      res.status(400).json({ error: 'Please provide valid payment source details.' });
      return;
    }

    const referenceId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    try {
      const result = await executeWalletMutation({
        uid: req.user!.uid,
        email: req.user!.email || '',
        displayName: typeof req.user!.name === 'string' ? req.user!.name : undefined,
        type: 'deposit',
        amount,
        method,
        referenceId,
        note: `Deposited via ${method} (${detail})`,
        idempotencyKey: idempotencyKey || undefined,
      });
      if (!result.ok) {
        res.status(result.status || 400).json({ error: result.error });
        return;
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Deposit failed.' });
    }
  });

  app.post('/api/wallet/withdraw', requireAuth, async (req: AuthRequest, res) => {
    const idempotencyKey = String(req.body?.idempotencyKey || '').trim().slice(0, 64);
    const amount = Math.round(Number(req.body?.amount));
    const method = String(req.body?.method || 'UPI Payout').trim();
    const detail = String(req.body?.detail || '').trim();

    if (!Number.isFinite(amount) || amount < 100 || amount > 100000) {
      res.status(400).json({ error: 'Withdrawal amount must be between ₹100 and ₹1,00,000.' });
      return;
    }
    if (!detail || !detail.includes('@')) {
      res.status(400).json({ error: 'Please provide a valid destination UPI ID (e.g. name@okaxis).' });
      return;
    }

    const referenceId = `WDR-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 6)
      .toUpperCase()}`;

    try {
      const result = await executeWalletMutation({
        uid: req.user!.uid,
        email: req.user!.email || '',
        displayName: typeof req.user!.name === 'string' ? req.user!.name : undefined,
        type: 'withdraw',
        amount,
        method,
        referenceId,
        note: `Withdrawn to ${method} (${detail})`,
        idempotencyKey: idempotencyKey || undefined,
      });
      if (!result.ok) {
        res.status(result.status || 400).json({ error: result.error });
        return;
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Withdrawal failed.' });
    }
  });

  app.post('/api/wallet/debit', requireAuth, async (req: AuthRequest, res) => {
    const amount = Math.round(Number(req.body?.amount));
    const method = String(req.body?.method || 'World Chess League').trim();
    const note = String(req.body?.note || 'League Entry Fee').trim();

    if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
      res.status(400).json({ error: 'Invalid entry fee amount.' });
      return;
    }

    const referenceId = `FEE-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    try {
      const result = await executeWalletMutation({
        uid: req.user!.uid,
        email: req.user!.email || '',
        displayName: typeof req.user!.name === 'string' ? req.user!.name : undefined,
        type: 'entry_fee',
        amount,
        method,
        referenceId,
        note,
      });
      if (!result.ok) {
        res.status(result.status || 400).json({ error: result.error });
        return;
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Entry fee debit failed.' });
    }
  });

  app.post('/api/wallet/credit', requireAuth, async (req: AuthRequest, res) => {
    const amount = Math.round(Number(req.body?.amount));
    const method = String(req.body?.method || 'League Prize').trim();
    const note = String(req.body?.note || 'Prize Won').trim();

    if (!Number.isFinite(amount) || amount <= 0 || amount > 100000) {
      res.status(400).json({ error: 'Invalid prize amount.' });
      return;
    }

    const referenceId = `PRZ-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    try {
      const result = await executeWalletMutation({
        uid: req.user!.uid,
        email: req.user!.email || '',
        displayName: typeof req.user!.name === 'string' ? req.user!.name : undefined,
        type: 'prize',
        amount,
        method,
        referenceId,
        note,
      });
      if (!result.ok) {
        res.status(result.status || 400).json({ error: result.error });
        return;
      }
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Prize credit failed.' });
    }
  });

  app.post('/api/campus/sponsor', (req, res) => {
    const institutionName = String(req.body?.institutionName || '').trim().slice(0, 80);
    const coordinatorName = String(req.body?.coordinatorName || '').trim().slice(0, 60);
    const division = String(req.body?.division || 'High School').trim().slice(0, 40);
    const tierId =
      req.body?.tierId === 'hard' ||
      req.body?.tierId === 'hardcore' ||
      req.body?.tierId === 'expert'
        ? req.body.tierId
        : 'normal';
    const studentSeats = Math.max(1, Math.min(500, Math.round(Number(req.body?.studentSeats) || 50)));
    const amount = Number(req.body?.amount);
    const paymentMethod = String(req.body?.paymentMethod || 'Institutional Bank').trim();
    const detail = String(req.body?.detail || '').trim();

    if (!institutionName) {
      res.status(400).json({ error: 'Please enter the School or College Name.' });
      return;
    }
    if (!Number.isFinite(amount) || amount < 500 || amount > 500000) {
      res.status(400).json({ error: 'Management sponsorship amount must be between ₹500 and ₹5,00,000.' });
      return;
    }
    if (!detail) {
      res.status(400).json({ error: 'Please provide Management Bank / UPI / Card reference.' });
      return;
    }

    const receiptId = `MGMT-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;
    const passCode = `FREE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

    res.json({
      ok: true,
      sponsorship: {
        id: receiptId,
        passCode,
        institutionName,
        coordinatorName: coordinatorName || 'Sports Management',
        division,
        tierId,
        studentSeats,
        amountPaidByManagement: Math.round(amount),
        paymentMethod: `${paymentMethod} (${detail})`,
        timestampIso: new Date().toISOString(),
        redeemedForLeague: false,
      },
    });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  app.get('/api/moradabad/state', async (_req, res) => {
    await ensureHydratedFromSql();
    res.json({ ok: true, leagues: serializeMoradabadState() });
  });

  app.get('/api/world/state', async (_req, res) => {
    await ensureHydratedFromSql();
    res.json({ ok: true, worldLeague: serializeWorldState() });
  });

  function pairWorldPlayers(
    playerA: WorldLivePlayer,
    playerB: WorldLivePlayer,
    timeControlId: string
  ) {
    const swap = Math.random() < 0.5;
    const whiteP = swap ? playerB : playerA;
    const blackP = swap ? playerA : playerB;

    const room = createRoomRecord(timeControlId, 'w', {
      kind: 'world',
      leagueTitle: 'World Chess League Championship',
      whiteInstitution: `Tier: ${whiteP.tierId.toUpperCase()}`,
      blackInstitution: `Tier: ${blackP.tierId.toUpperCase()}`,
    });

    assignPlayerToRoom(room, whiteP.playerId, whiteP.name, whiteP.elo);
    assignPlayerToRoom(room, blackP.playerId, blackP.name, blackP.elo);

    whiteP.waitingForMatch = false;
    blackP.waitingForMatch = false;
    whiteP.inRoomCode = room.code;
    blackP.inRoomCode = room.code;

    for (const sock of getSocketsForPlayer(whiteP.playerId)) {
      room.clients.set(sock, { playerId: whiteP.playerId });
    }
    for (const sock of getSocketsForPlayer(blackP.playerId)) {
      room.clients.set(sock, { playerId: blackP.playerId });
    }

    broadcastRoom(room);
    broadcastWorldState(wss);
  }

  app.post('/api/moradabad/register-institution', requireAuth, async (req: AuthRequest, res) => {
    await ensureHydratedFromSql();
    const division = parseMoradabadDivision(req.body?.division);
    const noun = getMoradabadNoun(division);
    const institutionName = String(req.body?.institutionName || '').trim().slice(0, 90);
    const coordinatorName = String(req.body?.coordinatorName || '').trim().slice(0, 60);
    const studentSeats = Math.max(1, Math.min(500, Math.round(Number(req.body?.studentSeats) || 50)));
    const paymentMethod = String(req.body?.paymentMethod || 'Institutional Bank').trim();
    const detail = String(req.body?.detail || '').trim();

    if (!institutionName) {
      res.status(400).json({
        error: `Please enter the ${noun} Name in Moradabad, Uttar Pradesh.`,
      });
      return;
    }
    if (!detail) {
      res.status(400).json({ error: 'Please provide Management Bank / UPI / Card reference.' });
      return;
    }

    const prefix =
      division === 'school' ? 'MBD-SCH' : division === 'college' ? 'MBD-COL' : 'MBD-CMP';
    const passCode = `${prefix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const receiptId = `MBD-REC-${Date.now().toString(36).toUpperCase()}-${Math.random()
      .toString(36)
      .slice(2, 5)
      .toUpperCase()}`;

    const inst: MoradabadInstitution = {
      id: receiptId,
      passCode,
      division,
      name: institutionName,
      city: 'Moradabad, Uttar Pradesh',
      coordinatorName: coordinatorName || `${noun} Management`,
      feePaid: MORADABAD_MANAGEMENT_FEE,
      paymentMethod: `${paymentMethod} (${detail})`,
      studentSeats,
      registeredAt: new Date().toISOString(),
    };

    try {
      await insertMoradabadInstitutionToDb({
        ...inst,
        ownerUid: req.user!.uid,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message || 'Unable to save institution registration.' });
      return;
    }

    moradabadInstitutions[division].unshift(inst);
    moradabadSettled[division] = false;
    broadcastMoradabadState(wss);

    res.json({
      ok: true,
      institution: inst,
      leagues: serializeMoradabadState(),
    });
  });

  function pairMoradabadPlayers(
    division: MoradabadDivision,
    playerA: MoradabadLeaguePlayer,
    playerB: MoradabadLeaguePlayer,
    timeControlId: string
  ) {
    const swap = Math.random() < 0.5;
    const whiteP = swap ? playerB : playerA;
    const blackP = swap ? playerA : playerB;

    const leagueTitle = getMoradabadShortTitle(division);

    const room = createRoomRecord(timeControlId, 'w', {
      kind: 'moradabad',
      division,
      leagueTitle,
      whiteInstitution: whiteP.institutionName,
      blackInstitution: blackP.institutionName,
    });

    assignPlayerToRoom(room, whiteP.playerId, whiteP.name, whiteP.elo);
    assignPlayerToRoom(room, blackP.playerId, blackP.name, blackP.elo);

    whiteP.waitingForMatch = false;
    blackP.waitingForMatch = false;
    whiteP.inRoomCode = room.code;
    blackP.inRoomCode = room.code;

    for (const sock of getSocketsForPlayer(whiteP.playerId)) {
      room.clients.set(sock, { playerId: whiteP.playerId });
    }
    for (const sock of getSocketsForPlayer(blackP.playerId)) {
      room.clients.set(sock, { playerId: blackP.playerId });
    }

    broadcastRoom(room);
    broadcastMoradabadState(wss);
  }

  wss.on('connection', (ws) => {
    let joinedRoomCode: string | null = null;
    let joinedPlayerId: string | null = null;
    onlineClients.set(ws, { playerId: '', name: 'Challenger', elo: 1200 });

    ws.send(
      JSON.stringify({
        type: 'arena:chat_init',
        messages: globalChat.slice(-60),
        onlineCount: getUniqueOnlineCount(),
      })
    );
    ws.send(
      JSON.stringify({
        type: 'moradabad:state',
        leagues: serializeMoradabadState(),
      })
    );
    ws.send(
      JSON.stringify({
        type: 'world:state',
        worldLeague: serializeWorldState(),
      })
    );
    broadcastAll(wss, {
      type: 'arena:presence',
      onlineCount: getUniqueOnlineCount(),
    });

    ws.on('message', (raw) => {
      let msg: Record<string, unknown>;
      try {
        msg = JSON.parse(raw.toString()) as Record<string, unknown>;
      } catch {
        return;
      }

      const type = msg.type;

      if (type === 'arena:hello') {
        const playerId = String(msg.playerId || '').slice(0, 48);
        const name = String(msg.name || 'Challenger').slice(0, 24) || 'Challenger';
        const elo = Number.isFinite(Number(msg.elo)) ? Number(msg.elo) : 1200;
        onlineClients.set(ws, { playerId, name, elo });

        for (const div of ['school', 'college', 'company'] as MoradabadDivision[]) {
          const entry = moradabadPlayers[div].get(playerId);
          if (entry) {
            entry.name = name;
            entry.elo = elo;
            entry.online = true;
          }
        }
        const worldEntry = worldLeaguePlayers.get(playerId);
        if (worldEntry) {
          worldEntry.name = name;
          worldEntry.elo = elo;
          worldEntry.online = true;
        }

        broadcastAll(wss, {
          type: 'arena:presence',
          onlineCount: getUniqueOnlineCount(),
        });
        broadcastMoradabadState(wss);
        broadcastWorldState(wss);
        return;
      }

      if (type === 'world:join') {
        const playerId = String(msg.playerId || '').slice(0, 48);
        const name = String(msg.name || 'Challenger').trim().slice(0, 24) || 'Challenger';
        const elo = Number.isFinite(Number(msg.elo)) ? Number(msg.elo) : 1200;
        const tierId: 'normal' | 'hard' | 'hardcore' | 'expert' =
          msg.tierId === 'hard' || msg.tierId === 'hardcore' || msg.tierId === 'expert'
            ? msg.tierId
            : 'normal';
        const entryFeePaid = Number.isFinite(Number(msg.entryFeePaid))
          ? Math.max(0, Number(msg.entryFeePaid))
          : WORLD_TIER_FEES[tierId];

        if (!playerId) return;

        if (!onlineClients.has(ws) || onlineClients.get(ws)?.playerId !== playerId) {
          onlineClients.set(ws, { playerId, name, elo });
        }

        if (!worldLeaguePlayers.has(playerId) && worldLeaguePlayers.size >= 50) {
          ws.send(
            JSON.stringify({
              type: 'world:error',
              message: 'World Chess League is full (50/50 entered players).',
            })
          );
          return;
        }

        const existing = worldLeaguePlayers.get(playerId);
        if (existing) {
          existing.name = name;
          existing.elo = elo;
          existing.online = true;
        } else {
          worldLeaguePlayers.set(playerId, {
            playerId,
            name,
            elo,
            tierId,
            entryFeePaid,
            online: true,
            waitingForMatch: false,
            inRoomCode: null,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            matchesPlayed: 0,
            joinedAt: new Date().toISOString(),
          });
        }

        worldLeagueSettled = false;
        upsertLeagueEntryToDb({
          leagueKind: 'world',
          playerId,
          playerName: name,
          elo,
          tierId,
          entryFeePaid,
        }).catch((e) => console.error('Failed to persist World League entry:', e));

        broadcastWorldState(wss);
        return;
      }

      if (type === 'world:find_match') {
        const playerId = String(msg.playerId || '').slice(0, 48);
        const timeControlId = typeof msg.timeControlId === 'string' ? msg.timeControlId : '5+0';
        const me = worldLeaguePlayers.get(playerId);

        if (!me) {
          ws.send(
            JSON.stringify({
              type: 'world:error',
              message: 'Enter the World Chess League first before finding a human opponent.',
            })
          );
          return;
        }

        const waitingOpp = [...worldLeaguePlayers.values()].find(
          (p) => p.playerId !== playerId && p.waitingForMatch && isPlayerOnline(p.playerId)
        );

        if (waitingOpp) {
          pairWorldPlayers(me, waitingOpp, timeControlId);
        } else {
          me.waitingForMatch = true;
          broadcastWorldState(wss);
        }
        return;
      }

      if (type === 'world:cancel_wait') {
        const playerId = String(msg.playerId || '').slice(0, 48);
        const me = worldLeaguePlayers.get(playerId);
        if (me) {
          me.waitingForMatch = false;
          broadcastWorldState(wss);
        }
        return;
      }

      if (type === 'world:challenge_player') {
        const playerId = String(msg.playerId || '').slice(0, 48);
        const targetPlayerId = String(msg.targetPlayerId || '').slice(0, 48);
        const timeControlId = typeof msg.timeControlId === 'string' ? msg.timeControlId : '5+0';

        const me = worldLeaguePlayers.get(playerId);
        const target = worldLeaguePlayers.get(targetPlayerId);

        if (!me || !target || me.playerId === target.playerId) {
          ws.send(
            JSON.stringify({
              type: 'world:error',
              message: 'Both players must be entered in the World Chess League to start a human vs human match.',
            })
          );
          return;
        }

        if (!isPlayerOnline(target.playerId)) {
          ws.send(
            JSON.stringify({
              type: 'world:error',
              message: `${target.name} is currently offline.`,
            })
          );
          return;
        }

        pairWorldPlayers(me, target, timeControlId);
        return;
      }

      if (type === 'world:settle_prizes') {
        if (worldLeaguePlayers.size > 0 && worldLeagueMatches.length > 0) {
          worldLeagueSettled = true;
          broadcastWorldState(wss);
        }
        return;
      }

      if (type === 'moradabad:join_league') {
        const division = parseMoradabadDivision(msg.division);
        const noun = getMoradabadNoun(division);
        const playerId = String(msg.playerId || '').slice(0, 48);
        const name = String(msg.name || 'Player').trim().slice(0, 24) || 'Player';
        const elo = Number.isFinite(Number(msg.elo)) ? Number(msg.elo) : 1200;
        const institutionId = String(msg.institutionId || '').trim();
        const passCode = String(msg.passCode || '').trim().toUpperCase();

        if (!playerId) return;

        if (!onlineClients.has(ws) || onlineClients.get(ws)?.playerId !== playerId) {
          onlineClients.set(ws, { playerId, name, elo });
        }

        const inst = moradabadInstitutions[division].find(
          (item) =>
            (institutionId && item.id === institutionId) ||
            (passCode && item.passCode === passCode)
        );

        if (!inst) {
          ws.send(
            JSON.stringify({
              type: 'moradabad:error',
              message: `Please register your Moradabad ${noun} (₹10,000 Management fee) or select a registered ${noun.toLowerCase()} first.`,
            })
          );
          return;
        }

        const existing = moradabadPlayers[division].get(playerId);
        if (existing) {
          existing.name = name;
          existing.elo = elo;
          existing.institutionId = inst.id;
          existing.institutionName = inst.name;
          existing.online = true;
        } else {
          moradabadPlayers[division].set(playerId, {
            playerId,
            name,
            elo,
            division,
            institutionId: inst.id,
            institutionName: inst.name,
            online: true,
            waitingForMatch: false,
            inRoomCode: null,
            wins: 0,
            draws: 0,
            losses: 0,
            points: 0,
            matchesPlayed: 0,
            joinedAt: new Date().toISOString(),
          });
        }

        upsertLeagueEntryToDb({
          leagueKind: `moradabad_${division}`,
          playerId,
          playerName: name,
          elo,
          institutionId: inst.id,
          institutionName: inst.name,
        }).catch((e) => console.error('Failed to persist Moradabad League entry:', e));

        broadcastMoradabadState(wss);
        return;
      }

      if (type === 'moradabad:find_match') {
        const division = parseMoradabadDivision(msg.division);
        const noun = getMoradabadNoun(division);
        const playerId = String(msg.playerId || '').slice(0, 48);
        const timeControlId = typeof msg.timeControlId === 'string' ? msg.timeControlId : '10+0';
        const me = moradabadPlayers[division].get(playerId);

        if (!me) {
          ws.send(
            JSON.stringify({
              type: 'moradabad:error',
              message: `Join the Moradabad ${noun} League first (₹0 Player Entry).`,
            })
          );
          return;
        }

        const waitingOpp = [...moradabadPlayers[division].values()].find(
          (p) => p.playerId !== playerId && p.waitingForMatch && isPlayerOnline(p.playerId)
        );

        if (waitingOpp) {
          pairMoradabadPlayers(division, me, waitingOpp, timeControlId);
        } else {
          me.waitingForMatch = true;
          broadcastMoradabadState(wss);
        }
        return;
      }

      if (type === 'moradabad:cancel_wait') {
        const division = parseMoradabadDivision(msg.division);
        const playerId = String(msg.playerId || '').slice(0, 48);
        const me = moradabadPlayers[division].get(playerId);
        if (me) {
          me.waitingForMatch = false;
          broadcastMoradabadState(wss);
        }
        return;
      }

      if (type === 'moradabad:challenge_player') {
        const division = parseMoradabadDivision(msg.division);
        const playerId = String(msg.playerId || '').slice(0, 48);
        const targetPlayerId = String(msg.targetPlayerId || '').slice(0, 48);
        const timeControlId = typeof msg.timeControlId === 'string' ? msg.timeControlId : '10+0';

        const me = moradabadPlayers[division].get(playerId);
        const target = moradabadPlayers[division].get(targetPlayerId);

        if (!me || !target || me.playerId === target.playerId) {
          ws.send(
            JSON.stringify({
              type: 'moradabad:error',
              message: 'Both players must be enrolled in this Moradabad League to start a human vs human match.',
            })
          );
          return;
        }

        if (!isPlayerOnline(target.playerId)) {
          ws.send(
            JSON.stringify({
              type: 'moradabad:error',
              message: `${target.name} is currently offline.`,
            })
          );
          return;
        }

        pairMoradabadPlayers(division, me, target, timeControlId);
        return;
      }

      if (type === 'moradabad:settle_prizes') {
        const division = parseMoradabadDivision(msg.division);
        if (moradabadPlayers[division].size > 0 && moradabadRecentMatches[division].length > 0) {
          moradabadSettled[division] = true;
          broadcastMoradabadState(wss);
        }
        return;
      }

      if (type === 'arena:chat_send') {
        const text = String(msg.text || '').trim().slice(0, 240);
        if (!text) return;
        const senderId = String(msg.playerId || onlineClients.get(ws)?.playerId || 'anon').slice(0, 48);
        const senderName = String(msg.name || onlineClients.get(ws)?.name || 'Challenger').slice(0, 24) || 'Challenger';
        const senderElo = Number.isFinite(Number(msg.elo)) ? Number(msg.elo) : 1200;
        const chatMsg: ArenaChatMessage = {
          id: `gc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          senderId,
          senderName,
          senderElo,
          text,
          ts: Date.now(),
        };
        globalChat.push(chatMsg);
        if (globalChat.length > 80) {
          globalChat.splice(0, globalChat.length - 80);
        }
        broadcastAll(wss, {
          type: 'arena:chat_message',
          message: chatMsg,
        });
        return;
      }

      if (type === 'room:create') {
        const tc = typeof msg.timeControlId === 'string' ? msg.timeControlId : '3+2';
        const pref =
          msg.hostColorPref === 'b' || msg.hostColorPref === 'random'
            ? msg.hostColorPref
            : 'w';
        const playerId = String(msg.playerId || `p-${Date.now()}`);
        const name = String(msg.name || 'Challenger');
        const elo = Number(msg.elo || 1200);

        const room = createRoomRecord(tc, pref);
        assignPlayerToRoom(room, playerId, name, elo);
        room.clients.set(ws, { playerId });
        joinedRoomCode = room.code;
        joinedPlayerId = playerId;

        ws.send(JSON.stringify({ type: 'room:created', code: room.code }));
        broadcastRoom(room);
        return;
      }

      if (type === 'room:join') {
        const code = String(msg.code || '').toUpperCase().trim();
        const playerId = String(msg.playerId || `p-${Date.now()}`);
        const name = String(msg.name || 'Challenger');
        const elo = Number(msg.elo || 1200);

        const room = rooms.get(code);
        if (!room) {
          ws.send(JSON.stringify({ type: 'room:error', message: `Room ${code} does not exist.` }));
          return;
        }

        if (joinedRoomCode && joinedRoomCode !== code) {
          const prevRoom = rooms.get(joinedRoomCode);
          prevRoom?.clients.delete(ws);
        }

        assignPlayerToRoom(room, playerId, name, elo);
        room.clients.set(ws, { playerId });
        joinedRoomCode = code;
        joinedPlayerId = playerId;

        broadcastRoom(room);
        return;
      }

      if (type === 'move:attempt') {
        const code = String(msg.code || '').toUpperCase().trim();
        const playerId = String(msg.playerId || '');
        const from = String(msg.from || '');
        const to = String(msg.to || '');
        const promotion = typeof msg.promotion === 'string' ? msg.promotion : 'q';

        const room = rooms.get(code);
        if (!room || room.status !== 'playing') return;

        const turn = room.chess.turn();
        const expectedId = turn === 'w' ? room.white?.id : room.black?.id;
        if (!expectedId || expectedId !== playerId) return;

        const now = Date.now();
        if (room.moves.length > 0) {
          const elapsed = Math.max(0, now - room.lastMoveTimestamp);
          if (turn === 'w') {
            room.whiteTimeMs = Math.max(0, room.whiteTimeMs - elapsed);
            if (room.whiteTimeMs <= 0) {
              room.status = 'finished';
              room.winner = room.chess.isInsufficientMaterial() ? 'draw' : 'b';
              room.reason = 'timeout';
              broadcastRoom(room);
              finalizeMoradabadRoomMatch(room, wss);
              return;
            }
          } else {
            room.blackTimeMs = Math.max(0, room.blackTimeMs - elapsed);
            if (room.blackTimeMs <= 0) {
              room.status = 'finished';
              room.winner = room.chess.isInsufficientMaterial() ? 'draw' : 'w';
              room.reason = 'timeout';
              broadcastRoom(room);
              finalizeMoradabadRoomMatch(room, wss);
              return;
            }
          }
        }

        let moved;
        try {
          moved = room.chess.move({ from, to, promotion });
        } catch {
          return;
        }
        if (!moved) return;

        if (room.moves.length > 0 && room.incrementMs > 0) {
          if (turn === 'w') room.whiteTimeMs += room.incrementMs;
          else room.blackTimeMs += room.incrementMs;
        }
        room.lastMoveTimestamp = now;
        room.drawOfferBy = null;

        const ply = room.chess.history().length;
        room.moves.push({
          ply,
          moveNumber: Math.ceil(ply / 2),
          color: turn,
          san: moved.san,
          from: moved.from,
          to: moved.to,
          fenAfter: room.chess.fen(),
        });

        if (room.chess.isCheckmate()) {
          room.status = 'finished';
          room.winner = turn;
          room.reason = 'checkmate';
        } else if (room.chess.isStalemate()) {
          room.status = 'finished';
          room.winner = 'draw';
          room.reason = 'stalemate';
        } else if (room.chess.isThreefoldRepetition()) {
          room.status = 'finished';
          room.winner = 'draw';
          room.reason = 'repetition';
        } else if (room.chess.isInsufficientMaterial()) {
          room.status = 'finished';
          room.winner = 'draw';
          room.reason = 'insufficient';
        } else if (room.chess.isDraw()) {
          room.status = 'finished';
          room.winner = 'draw';
          room.reason = 'fifty-move';
        }

        broadcastRoom(room);
        finalizeMoradabadRoomMatch(room, wss);
        return;
      }

      if (type === 'draw:offer') {
        const code = String(msg.code || '').toUpperCase().trim();
        const playerId = String(msg.playerId || '');
        const room = rooms.get(code);
        if (!room || room.status !== 'playing') return;
        const color: PlayerColor | null =
          room.white?.id === playerId ? 'w' : room.black?.id === playerId ? 'b' : null;
        if (!color) return;
        room.drawOfferBy = color;
        broadcastRoom(room);
        return;
      }

      if (type === 'draw:respond') {
        const code = String(msg.code || '').toUpperCase().trim();
        const playerId = String(msg.playerId || '');
        const accept = Boolean(msg.accept);
        const room = rooms.get(code);
        if (!room || room.status !== 'playing' || !room.drawOfferBy) return;
        const responderColor: PlayerColor | null =
          room.white?.id === playerId ? 'w' : room.black?.id === playerId ? 'b' : null;
        if (!responderColor || responderColor === room.drawOfferBy) return;
        if (accept) {
          room.status = 'finished';
          room.winner = 'draw';
          room.reason = 'agreement';
        }
        room.drawOfferBy = null;
        broadcastRoom(room);
        finalizeMoradabadRoomMatch(room, wss);
        return;
      }

      if (type === 'resign') {
        const code = String(msg.code || '').toUpperCase().trim();
        const playerId = String(msg.playerId || '');
        const room = rooms.get(code);
        if (!room || room.status !== 'playing') return;
        if (room.white?.id === playerId) {
          room.status = 'finished';
          room.winner = 'b';
          room.reason = 'resignation';
          broadcastRoom(room);
          finalizeMoradabadRoomMatch(room, wss);
        } else if (room.black?.id === playerId) {
          room.status = 'finished';
          room.winner = 'w';
          room.reason = 'resignation';
          broadcastRoom(room);
          finalizeMoradabadRoomMatch(room, wss);
        }
        return;
      }

      if (type === 'rematch:request') {
        const code = String(msg.code || '').toUpperCase().trim();
        const playerId = String(msg.playerId || '');
        const room = rooms.get(code);
        if (!room || room.status !== 'finished') return;
        if (!room.rematchVotes.includes(playerId)) {
          room.rematchVotes.push(playerId);
        }
        if (
          room.white &&
          room.black &&
          room.rematchVotes.includes(room.white.id) &&
          room.rematchVotes.includes(room.black.id)
        ) {
          // Swap sides and reset board
          const prevWhite = room.white;
          room.white = room.black;
          room.black = prevWhite;
          room.chess = new Chess();
          room.moves = [];
          room.whiteTimeMs = room.initialMs;
          room.blackTimeMs = room.initialMs;
          room.lastMoveTimestamp = Date.now();
          room.status = 'playing';
          room.winner = null;
          room.reason = null;
          room.drawOfferBy = null;
          room.rematchVotes = [];
          room.leagueRecorded = false;
        }
        broadcastRoom(room);
        return;
      }

      if (type === 'chat:send') {
        const code = String(msg.code || '').toUpperCase().trim();
        const text = String(msg.text || '').trim().slice(0, 200);
        const sender = String(msg.name || 'Player').slice(0, 24);
        const room = rooms.get(code);
        if (!room || !text) return;
        room.chat.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          sender,
          text,
          ts: Date.now(),
        });
        broadcastRoom(room);
      }
    });

    ws.on('close', () => {
      const closedInfo = onlineClients.get(ws);
      onlineClients.delete(ws);
      if (closedInfo?.playerId && !isPlayerOnline(closedInfo.playerId)) {
        for (const div of ['school', 'college', 'company'] as MoradabadDivision[]) {
          const entry = moradabadPlayers[div].get(closedInfo.playerId);
          if (entry) {
            entry.online = false;
            entry.waitingForMatch = false;
          }
        }
        const worldEntry = worldLeaguePlayers.get(closedInfo.playerId);
        if (worldEntry) {
          worldEntry.online = false;
          worldEntry.waitingForMatch = false;
        }
      }
      broadcastAll(wss, {
        type: 'arena:presence',
        onlineCount: getUniqueOnlineCount(),
      });
      broadcastMoradabadState(wss);
      broadcastWorldState(wss);
      if (joinedRoomCode) {
        const room = rooms.get(joinedRoomCode);
        if (room) {
          room.clients.delete(ws);
          if (joinedPlayerId && room.white?.id === joinedPlayerId) {
            room.white.connected = false;
          }
          if (joinedPlayerId && room.black?.id === joinedPlayerId) {
            room.black.connected = false;
          }
          broadcastRoom(room);
        }
      }
    });
  });

  // Authoritative clock timeout watcher & stale room cleanup
  setInterval(() => {
    const now = Date.now();
    for (const [code, room] of rooms.entries()) {
      if (now - room.createdAt > 6 * 60 * 60 * 1000 && room.clients.size === 0) {
        rooms.delete(code);
        continue;
      }
      if (room.status === 'playing' && room.moves.length > 0) {
        const clocks = getLiveClocks(room);
        if (clocks.whiteTimeMs <= 0) {
          room.whiteTimeMs = 0;
          room.status = 'finished';
          room.winner = room.chess.isInsufficientMaterial() ? 'draw' : 'b';
          room.reason = 'timeout';
          broadcastRoom(room);
          finalizeMoradabadRoomMatch(room, wss);
        } else if (clocks.blackTimeMs <= 0) {
          room.blackTimeMs = 0;
          room.status = 'finished';
          room.winner = room.chess.isInsufficientMaterial() ? 'draw' : 'w';
          room.reason = 'timeout';
          broadcastRoom(room);
          finalizeMoradabadRoomMatch(room, wss);
        }
      }
    }
  }, 250);

  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const PORT =
    process.env.NODE_ENV === 'production'
      ? Number(process.env.PORT) || 3000
      : 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Grandmaster Arena server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
