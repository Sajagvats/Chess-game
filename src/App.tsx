import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Chess, PieceSymbol } from 'chess.js';
import {
  Award,
  Box,
  Check,
  ChevronFirst,
  ChevronLast,
  ChevronLeft,
  ChevronRight,
  Copy,
  Flag,
  Globe2,
  Grid,
  Handshake,
  Link2,
  LogIn,
  LogOut,
  Play,
  RefreshCw,
  RotateCcw,
  User as UserIcon,
  Volume2,
  VolumeX,
  Wallet,
} from 'lucide-react';
import {
  auth,
  authFetch,
  signInWithGoogle,
  signOutAccount,
  subscribeAuth,
  type AuthUser,
} from './lib/firebase';
import {
  BOARD_THEMES,
  COMPUTER_LEVELS,
  RIVALS,
  TIME_CONTROLS,
  detectOpeningName,
} from './data/rivals';
import {
  ArenaChatMessage,
  BoardThemeId,
  BracketMatch,
  BracketParticipant,
  FriendRoomState,
  GameOutcomeReason,
  GameResult,
  LeagueDifficulty,
  MatchMode,
  MatchRecord,
  MoradabadDivision,
  MoradabadLeaguesState,
  MoveEntry,
  PlayerColor,
  PlayerProfile,
  TournamentState,
  WalletTransaction,
  WorldLiveState,
} from './types/chess';
import {
  calculateEloDelta,
  evaluatePositionCp,
  getCapturedAndAdvantage,
  selectBotMove,
  shouldBotAcceptDraw,
} from './utils/chessEngine';
import { soundEngine } from './utils/sound';
import {
  LEAGUE_PRIZES,
  LEAGUE_PRIZE_POOL,
  LEAGUE_TIERS,
} from './utils/worldLeague';
import { ChessBoard } from './components/ChessBoard';
import { ChessBoard3D } from './components/ChessBoard3D';
import { EvalBar } from './components/EvalBar';
import { MatchClockCard } from './components/MatchClockCard';
import { TournamentView } from './components/TournamentView';
import { WorldLeagueView } from './components/WorldLeagueView';
import { FriendChallengeView } from './components/FriendChallengeView';
import { LadderView } from './components/LadderView';
import { RulesView } from './components/RulesView';
import { PostMatchModal } from './components/PostMatchModal';
import { WalletModal } from './components/WalletModal';
import { LiveChatPanel } from './components/LiveChatPanel';
import { CampusView } from './components/CampusView';

type AppTab =
  | 'arena'
  | 'league'
  | 'school'
  | 'college'
  | 'company'
  | 'challenge'
  | 'tournament'
  | 'ladder'
  | 'rules';
type GamePhase = 'SETUP' | 'PLAYING' | 'GAME_OVER';

const PROFILE_STORAGE_KEY = 'grandmaster_arena_profile_v2';
const THEME_STORAGE_KEY = 'grandmaster_arena_theme_v1';

function createInitialPlayerId(): string {
  return `usr-${Math.random().toString(36).slice(2, 10)}`;
}

function getTabPlayerId(): string {
  try {
    const existing = sessionStorage.getItem('grandmaster_arena_tab_id');
    if (existing) return existing;
    const created = createInitialPlayerId();
    sessionStorage.setItem('grandmaster_arena_tab_id', created);
    return created;
  } catch {
    return createInitialPlayerId();
  }
}

const DEFAULT_WORLD_LEAGUE: WorldLiveState = {
  title: 'World Chess League Championship',
  maxPlayers: 50,
  prizePool: LEAGUE_PRIZE_POOL,
  prizes: {
    first: LEAGUE_PRIZES.first,
    second: LEAGUE_PRIZES.second,
    third: LEAGUE_PRIZES.third,
  },
  players: [],
  recentMatches: [],
  payoutSettled: false,
};

const DEFAULT_MORADABAD_LEAGUES: MoradabadLeaguesState = {
  school: {
    division: 'school',
    title: 'Moradabad School Chess League (Uttar Pradesh)',
    city: 'Moradabad, Uttar Pradesh',
    managementFeePerInstitution: 10000,
    studentEntryFee: 0,
    prizePool: 0,
    prizes: { first: 0, second: 0, third: 0 },
    institutions: [],
    players: [],
    recentMatches: [],
    payoutSettled: false,
  },
  college: {
    division: 'college',
    title: 'Moradabad College Chess League (Uttar Pradesh)',
    city: 'Moradabad, Uttar Pradesh',
    managementFeePerInstitution: 10000,
    studentEntryFee: 0,
    prizePool: 0,
    prizes: { first: 0, second: 0, third: 0 },
    institutions: [],
    players: [],
    recentMatches: [],
    payoutSettled: false,
  },
  company: {
    division: 'company',
    title: 'Moradabad Companies Chess League (Uttar Pradesh)',
    city: 'Moradabad, Uttar Pradesh',
    managementFeePerInstitution: 10000,
    studentEntryFee: 0,
    prizePool: 0,
    prizes: { first: 0, second: 0, third: 0 },
    institutions: [],
    players: [],
    recentMatches: [],
    payoutSettled: false,
  },
};

const DEFAULT_PROFILE: PlayerProfile = {
  id: getTabPlayerId(),
  name: 'Challenger',
  elo: 1200,
  peakElo: 1200,
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  trophies: 0,
  walletBalance: 500,
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
  history: [],
};

function loadProfile(): PlayerProfile {
  const tabId = getTabPlayerId();
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE, id: tabId };
    const parsed = JSON.parse(raw) as Partial<PlayerProfile>;
    return {
      ...DEFAULT_PROFILE,
      ...parsed,
      id: tabId,
      walletBalance:
        typeof parsed.walletBalance === 'number' ? parsed.walletBalance : DEFAULT_PROFILE.walletBalance,
      transactions: Array.isArray(parsed.transactions)
        ? parsed.transactions
        : DEFAULT_PROFILE.transactions,
      history: Array.isArray(parsed.history) ? parsed.history : [],
    };
  } catch {
    return { ...DEFAULT_PROFILE, id: tabId };
  }
}

function loadThemeId(): BoardThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY) as BoardThemeId | null;
    if (raw && BOARD_THEMES.some((t) => t.id === raw)) return raw;
  } catch {
    // ignore
  }
  return 'walnut';
}

function simulateAiBracketMatch(a: BracketParticipant, b: BracketParticipant): string {
  const expectedA = 1 / (1 + Math.pow(10, (b.elo - a.elo) / 400));
  return Math.random() < expectedA ? a.id : b.id;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('arena');
  const [profile, setProfile] = useState<PlayerProfile>(() => loadProfile());
  const [boardThemeId, setBoardThemeId] = useState<BoardThemeId>(() => loadThemeId());
  const [boardDimension, setBoardDimension] = useState<'3d' | '2d'>('3d');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showWalletModal, setShowWalletModal] = useState(false);

  // Match setup state
  const [matchMode, setMatchMode] = useState<MatchMode>('rated');
  const [selectedRivalId, setSelectedRivalId] = useState<string>('aarav');
  const [selectedTimeControlId, setSelectedTimeControlId] = useState<string>('3+2');
  const [preferredSide, setPreferredSide] = useState<'w' | 'b' | 'random'>('w');
  const [autoFlipLocal, setAutoFlipLocal] = useState(false);

  // Active game state
  const chessRef = useRef<Chess>(new Chess());
  const [gamePhase, setGamePhase] = useState<GamePhase>('SETUP');
  const [playerColor, setPlayerColor] = useState<PlayerColor>('w');
  const [boardOrientation, setBoardOrientation] = useState<PlayerColor>('w');
  const [liveFen, setLiveFen] = useState<string>(() => new Chess().fen());
  const [moves, setMoves] = useState<MoveEntry[]>([]);
  const [reviewPly, setReviewPly] = useState<number | null>(null);
  const [evalCp, setEvalCp] = useState<number>(20);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Clocks (ms)
  const [whiteTimeMs, setWhiteTimeMs] = useState<number>(180000);
  const [blackTimeMs, setBlackTimeMs] = useState<number>(180000);
  const lastTickRef = useRef<number>(Date.now());
  const lowTimeAlertedRef = useRef<{ w: boolean; b: boolean }>({ w: false, b: false });

  // Result & modal
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  const [showPostMatchModal, setShowPostMatchModal] = useState(false);
  const [copiedFen, setCopiedFen] = useState(false);
  const [copiedRoomLink, setCopiedRoomLink] = useState(false);

  // Tournament Cup state
  const [tournament, setTournament] = useState<TournamentState | null>(null);
  const [activeBracketMatchId, setActiveBracketMatchId] = useState<string | null>(null);
  const [tournamentTimeControlId, setTournamentTimeControlId] = useState<string>('3+2');

  // World Chess League state (Live Human vs Human, max 50 players, ₹50,000 pool in 3:2:1)
  const [worldLeagueLive, setWorldLeagueLive] = useState<WorldLiveState>(DEFAULT_WORLD_LEAGUE);
  const [worldLeagueError, setWorldLeagueError] = useState<string | null>(null);
  const [selectedLeagueTier, setSelectedLeagueTier] = useState<LeagueDifficulty>('normal');
  const worldCreditedRef = useRef<boolean>(false);

  // Real-time WebSocket (Global Arena Chat + Friend Challenge Rooms + Live Leagues)
  const wsRef = useRef<WebSocket | null>(null);
  const wsConnectingRef = useRef<Promise<WebSocket> | null>(null);
  const profileRef = useRef(profile);
  profileRef.current = profile;
  const [wsConnected, setWsConnected] = useState(false);
  const [onlineCount, setOnlineCount] = useState(1);
  const [globalChat, setGlobalChat] = useState<ArenaChatMessage[]>([]);
  const [friendRoom, setFriendRoom] = useState<FriendRoomState | null>(null);
  const [friendRoomError, setFriendRoomError] = useState<string | null>(null);
  const friendConcludedCodeRef = useRef<string | null>(null);

  // Moradabad, Uttar Pradesh — School, College & Companies Chess Leagues
  const [moradabadLeagues, setMoradabadLeagues] = useState<MoradabadLeaguesState>(
    DEFAULT_MORADABAD_LEAGUES
  );
  const [moradabadError, setMoradabadError] = useState<string | null>(null);
  const [initialMoradabadPass, setInitialMoradabadPass] = useState<string>('');
  const moradabadCreditedRef = useRef<Record<MoradabadDivision, boolean>>({
    school: false,
    college: false,
    company: false,
  });
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const syncAccountFromBackend = useCallback(async () => {
    try {
      const resp = await authFetch('/api/account/me');
      const data = await resp.json();
      if (resp.ok && data?.ok && data.user) {
        setProfile((prev) => ({
          ...prev,
          id: data.user.uid || prev.id,
          name: data.user.name || prev.name,
          elo: typeof data.user.elo === 'number' ? data.user.elo : prev.elo,
          peakElo: typeof data.user.peakElo === 'number' ? data.user.peakElo : prev.peakElo,
          wins: typeof data.user.wins === 'number' ? data.user.wins : prev.wins,
          losses: typeof data.user.losses === 'number' ? data.user.losses : prev.losses,
          draws: typeof data.user.draws === 'number' ? data.user.draws : prev.draws,
          streak: typeof data.user.streak === 'number' ? data.user.streak : prev.streak,
          trophies: typeof data.user.trophies === 'number' ? data.user.trophies : prev.trophies,
          walletBalance:
            typeof data.user.walletBalance === 'number' ? data.user.walletBalance : prev.walletBalance,
          transactions: Array.isArray(data.transactions) ? data.transactions : prev.transactions,
          history:
            Array.isArray(data.history) && data.history.length > 0 ? data.history : prev.history,
        }));
      }
    } catch {
      // ignore offline transient fetch error
    }
  }, []);

  useEffect(() => {
    const unsub = subscribeAuth((user) => {
      setAuthUser(user);
      if (user) {
        void syncAccountFromBackend();
      }
    });
    return () => unsub();
  }, [syncAccountFromBackend]);

  const handleSignIn = useCallback(async () => {
    if (authBusy) return;
    setAuthBusy(true);
    try {
      await signInWithGoogle();
      await syncAccountFromBackend();
    } catch {
      // user cancelled popup
    } finally {
      setAuthBusy(false);
    }
  }, [authBusy, syncAccountFromBackend]);

  const handleSignOut = useCallback(async () => {
    await signOutAccount();
    setAuthUser(null);
  }, []);

  const selectedRival = useMemo(
    () => RIVALS.find((r) => r.id === selectedRivalId) ?? RIVALS[1],
    [selectedRivalId]
  );

  const activeTimeControl = useMemo(() => {
    const id =
      matchMode === 'friend' && friendRoom ? friendRoom.timeControlId : selectedTimeControlId;
    return TIME_CONTROLS.find((tc) => tc.id === id) ?? TIME_CONTROLS[3];
  }, [friendRoom, matchMode, selectedTimeControlId]);

  const boardTheme = useMemo(
    () => BOARD_THEMES.find((t) => t.id === boardThemeId) ?? BOARD_THEMES[0],
    [boardThemeId]
  );

  useEffect(() => {
    try {
      localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // ignore
    }
  }, [profile]);

  useEffect(() => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, boardThemeId);
    } catch {
      // ignore
    }
  }, [boardThemeId]);

  useEffect(() => {
    soundEngine.enabled = soundEnabled;
  }, [soundEnabled]);

  const recordWalletTransaction = useCallback((tx: WalletTransaction, balanceDelta: number) => {
    setProfile((prev) => ({
      ...prev,
      walletBalance: Math.max(0, prev.walletBalance + balanceDelta),
      transactions: [tx, ...prev.transactions].slice(0, 60),
    }));
  }, []);

  const syncServerWallet = useCallback(
    (balance: number, transactions: WalletTransaction[]) => {
      setProfile((prev) => ({
        ...prev,
        walletBalance: balance,
        transactions: transactions.length > 0 ? transactions : prev.transactions,
      }));
    },
    []
  );

  // Connect WebSocket for Real-Time Global Arena Chat & Friend Challenges
  const ensureWebSocket = useCallback((): Promise<WebSocket> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return Promise.resolve(wsRef.current);
    }
    if (wsConnectingRef.current) {
      return wsConnectingRef.current;
    }

    const promise = new Promise<WebSocket>((resolve, reject) => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
      wsRef.current = ws;

      ws.onopen = () => {
        wsConnectingRef.current = null;
        setWsConnected(true);
        const p = profileRef.current;
        ws.send(
          JSON.stringify({
            type: 'arena:hello',
            playerId: p.id,
            name: p.name,
            elo: p.elo,
          })
        );
        resolve(ws);
      };

      ws.onerror = () => {
        wsConnectingRef.current = null;
        setWsConnected(false);
        reject(new Error('WebSocket connection failed'));
      };

      ws.onclose = () => {
        wsConnectingRef.current = null;
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setWsConnected(false);
      };

      ws.onmessage = (event) => {
        let payload: {
          type: string;
          room?: FriendRoomState;
          leagues?: MoradabadLeaguesState;
          worldLeague?: WorldLiveState;
          message?: string | ArenaChatMessage;
          messages?: ArenaChatMessage[];
          onlineCount?: number;
          code?: string;
        };
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }

        if (payload.type === 'moradabad:state' && payload.leagues) {
          setMoradabadLeagues(payload.leagues);
          setMoradabadError(null);
          return;
        }

        if (payload.type === 'moradabad:error') {
          setMoradabadError(
            typeof payload.message === 'string'
              ? payload.message
              : 'Moradabad League request failed.'
          );
          return;
        }

        if (payload.type === 'world:state' && payload.worldLeague) {
          setWorldLeagueLive(payload.worldLeague);
          setWorldLeagueError(null);
          return;
        }

        if (payload.type === 'world:error') {
          setWorldLeagueError(
            typeof payload.message === 'string'
              ? payload.message
              : 'World Chess League request failed.'
          );
          return;
        }

        if (payload.type === 'arena:chat_init') {
          if (Array.isArray(payload.messages)) {
            setGlobalChat(payload.messages);
          }
          if (typeof payload.onlineCount === 'number') {
            setOnlineCount(payload.onlineCount);
          }
          return;
        }

        if (payload.type === 'arena:presence') {
          if (typeof payload.onlineCount === 'number') {
            setOnlineCount(payload.onlineCount);
          }
          return;
        }

        if (payload.type === 'arena:chat_message' && payload.message && typeof payload.message === 'object') {
          const incoming = payload.message as ArenaChatMessage;
          setGlobalChat((prev) => {
            if (prev.some((m) => m.id === incoming.id)) return prev;
            return [...prev, incoming].slice(-80);
          });
          return;
        }

        if (payload.type === 'room:error') {
          setFriendRoomError(typeof payload.message === 'string' ? payload.message : 'Unable to join room.');
          return;
        }

        if (payload.type === 'room:state' && payload.room) {
          const rm = payload.room;
          const currProfile = profileRef.current;
          setFriendRoomError(null);
          setFriendRoom(rm);
          setMatchMode('friend');
          setActiveTab('arena');

          const myColor: PlayerColor = rm.black?.id === currProfile.id ? 'b' : 'w';
          setPlayerColor(myColor);
          setBoardOrientation(myColor);

          const serverChess = new Chess(rm.fen);
          chessRef.current = serverChess;
          setLiveFen(rm.fen);
          setWhiteTimeMs(rm.whiteTimeMs);
          setBlackTimeMs(rm.blackTimeMs);
          setEvalCp(evaluatePositionCp(serverChess));

          const mappedMoves: MoveEntry[] = rm.moves.map((m) => ({
            ply: m.ply,
            moveNumber: m.moveNumber,
            color: m.color,
            san: m.san,
            from: m.from,
            to: m.to,
            fenAfter: m.fenAfter,
            evalCp: 0,
            isCapture: m.san.includes('x'),
            isCheck: m.san.includes('+'),
            isMate: m.san.includes('#'),
          }));
          setMoves(mappedMoves);

          if (rm.status === 'waiting' || rm.status === 'playing') {
            friendConcludedCodeRef.current = null;
            setGamePhase('PLAYING');
            setShowPostMatchModal(false);
            setGameResult(null);
            if (rm.moves.length > 0) {
              const lastSan = rm.moves[rm.moves.length - 1].san;
              if (lastSan.includes('+') || lastSan.includes('#')) soundEngine.playCheck();
              else if (lastSan.includes('O-O')) soundEngine.playCastle();
              else if (lastSan.includes('x')) soundEngine.playCapture();
              else soundEngine.playMove();
            }
          } else if (rm.status === 'finished' && rm.winner) {
            setGamePhase('GAME_OVER');
            const conclusionKey = `${rm.code}-${rm.moves.length}-${rm.reason}`;
            if (friendConcludedCodeRef.current !== conclusionKey) {
              friendConcludedCodeRef.current = conclusionKey;
              const playerWon = rm.winner === myColor;
              soundEngine.playGameEnd(playerWon);
              setGameResult({
                winner: rm.winner,
                reason: (rm.reason as GameOutcomeReason) || 'checkmate',
                eloDelta: 0,
                newElo: currProfile.elo,
                accuracyWhite: 92,
                accuracyBlack: 92,
              });
              setShowPostMatchModal(true);
            }
          }
        }
      };
    });

    wsConnectingRef.current = promise;
    return promise;
  }, []);

  // Connect live WebSocket immediately on mount (and auto-join ?room=GM-XXXX, ?tab=league, or ?moradabad=school|college|company)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room');
    const moradabadParam = params.get('moradabad');
    const passParam = params.get('pass');
    const tabParam = params.get('tab');

    if (moradabadParam === 'school' || moradabadParam === 'college' || moradabadParam === 'company') {
      if (passParam) setInitialMoradabadPass(passParam.toUpperCase());
      setActiveTab(moradabadParam);
    } else if (tabParam === 'league') {
      setActiveTab('league');
    }

    fetch('/api/moradabad/state')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.leagues) {
          setMoradabadLeagues(data.leagues as MoradabadLeaguesState);
        }
      })
      .catch(() => {});

    fetch('/api/world/state')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && data.worldLeague) {
          setWorldLeagueLive(data.worldLeague as WorldLiveState);
        }
      })
      .catch(() => {});

    ensureWebSocket()
      .then((ws) => {
        if (roomParam) {
          const p = profileRef.current;
          ws.send(
            JSON.stringify({
              type: 'room:join',
              code: roomParam.toUpperCase(),
              playerId: p.id,
              name: p.name,
              elo: p.elo,
            })
          );
        }
      })
      .catch(() => {
        if (roomParam) {
          setFriendRoomError('Unable to connect to live Challenge server.');
        }
      });
  }, [ensureWebSocket]);

  // Keep presence identity updated on server when player edits name or Elo changes
  useEffect(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'arena:hello',
          playerId: profile.id,
          name: profile.name,
          elo: profile.elo,
        })
      );
    }
  }, [profile.elo, profile.id, profile.name]);

  const handleCreateFriendRoom = async (tcId: string, side: 'w' | 'b' | 'random') => {
    setFriendRoomError(null);
    const ws = await ensureWebSocket();
    ws.send(
      JSON.stringify({
        type: 'room:create',
        timeControlId: tcId,
        hostColorPref: side,
        playerId: profile.id,
        name: profile.name,
        elo: profile.elo,
      })
    );
  };

  const handleJoinFriendRoom = async (code: string) => {
    setFriendRoomError(null);
    const ws = await ensureWebSocket();
    ws.send(
      JSON.stringify({
        type: 'room:join',
        code: code.toUpperCase().trim(),
        playerId: profile.id,
        name: profile.name,
        elo: profile.elo,
      })
    );
  };

  // Moradabad, UP School & College League Handlers (₹10,000 Management Fee, ₹0 Student Entry, Human Only)
  const handleRegisterMoradabadInstitution = useCallback(
    async (payload: {
      division: MoradabadDivision;
      institutionName: string;
      coordinatorName: string;
      studentSeats: number;
      paymentMethod: string;
      detail: string;
    }) => {
      try {
        if (!auth.currentUser) {
          await signInWithGoogle();
        }
        const res = await authFetch('/api/moradabad/register-institution', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          return { ok: false, error: data.error || 'Registration failed.' };
        }
        if (data.leagues) {
          setMoradabadLeagues(data.leagues as MoradabadLeaguesState);
        }
        moradabadCreditedRef.current[payload.division] = false;
        return { ok: true, passCode: data.institution?.passCode as string | undefined };
      } catch {
        return { ok: false, error: 'Please sign in with Google to complete registration.' };
      }
    },
    []
  );

  const handleJoinMoradabadLeague = useCallback(
    async (
      division: MoradabadDivision,
      institutionId?: string,
      passCode?: string,
      studentName?: string
    ) => {
      setMoradabadError(null);
      try {
        const ws = await ensureWebSocket();
        ws.send(
          JSON.stringify({
            type: 'moradabad:join_league',
            division,
            playerId: profile.id,
            name: studentName?.trim() || profile.name,
            elo: profile.elo,
            institutionId,
            passCode,
          })
        );
      } catch {
        setMoradabadError('Unable to reach live Moradabad League server.');
      }
    },
    [ensureWebSocket, profile.elo, profile.id, profile.name]
  );

  const handleFindMoradabadMatch = useCallback(
    async (division: MoradabadDivision, timeControlId: string) => {
      setMoradabadError(null);
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'moradabad:find_match',
          division,
          playerId: profile.id,
          timeControlId,
        })
      );
    },
    [ensureWebSocket, profile.id]
  );

  const handleCancelMoradabadWait = useCallback(
    async (division: MoradabadDivision) => {
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'moradabad:cancel_wait',
          division,
          playerId: profile.id,
        })
      );
    },
    [ensureWebSocket, profile.id]
  );

  const handleChallengeMoradabadPlayer = useCallback(
    async (division: MoradabadDivision, targetPlayerId: string, timeControlId: string) => {
      setMoradabadError(null);
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'moradabad:challenge_player',
          division,
          playerId: profile.id,
          targetPlayerId,
          timeControlId,
        })
      );
    },
    [ensureWebSocket, profile.id]
  );

  const handleSettleMoradabadPrizes = useCallback(
    async (division: MoradabadDivision) => {
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'moradabad:settle_prizes',
          division,
        })
      );

      const divState = moradabadLeagues[division];
      const rankIdx = divState.players.findIndex((p) => p.playerId === profile.id);
      if (
        rankIdx >= 0 &&
        rankIdx <= 2 &&
        divState.prizePool > 0 &&
        !moradabadCreditedRef.current[division]
      ) {
        moradabadCreditedRef.current[division] = true;
        const prizeAmt =
          rankIdx === 0
            ? divState.prizes.first
            : rankIdx === 1
            ? divState.prizes.second
            : divState.prizes.third;
        if (prizeAmt > 0) {
          recordWalletTransaction(
            {
              id: `MBD-PRIZE-${Date.now()}`,
              type: 'prize',
              method: divState.title,
              referenceId: `MBD-${division.toUpperCase()}-R${rankIdx + 1}`,
              amount: prizeAmt,
              timestampIso: new Date().toISOString(),
              note: `Rank #${rankIdx + 1} Student Prize (${divState.title})`,
            },
            prizeAmt
          );
        }
      }
    },
    [ensureWebSocket, moradabadLeagues, profile.id, recordWalletTransaction]
  );

  const displayedFen = useMemo(() => {
    if (reviewPly === null) return liveFen;
    if (reviewPly === 0) return new Chess().fen();
    return moves[reviewPly - 1]?.fenAfter ?? liveFen;
  }, [liveFen, moves, reviewPly]);

  const displayedLastMove = useMemo(() => {
    if (reviewPly === 0) return null;
    const entry = reviewPly === null ? moves[moves.length - 1] : moves[reviewPly - 1];
    return entry ? { from: entry.from, to: entry.to } : null;
  }, [moves, reviewPly]);

  const openingName = useMemo(() => detectOpeningName(moves.map((m) => m.san)), [moves]);

  const materialInfo = useMemo(() => {
    const boardChess = new Chess(displayedFen);
    return getCapturedAndAdvantage(boardChess);
  }, [displayedFen]);

  const moveRows = useMemo(() => {
    const rows: { moveNumber: number; white?: MoveEntry; black?: MoveEntry }[] = [];
    for (let i = 0; i < moves.length; i += 2) {
      rows.push({
        moveNumber: Math.floor(i / 2) + 1,
        white: moves[i],
        black: moves[i + 1],
      });
    }
    return rows;
  }, [moves]);

  // Finalize offline/AI/League/Tournament match & record competitive stats
  const concludeGame = useCallback(
    (winner: PlayerColor | 'draw', reason: GameOutcomeReason, latestMoves?: MoveEntry[]) => {
      setGamePhase('GAME_OVER');
      setIsBotThinking(false);
      setReviewPly(null);

      const chess = chessRef.current;
      const moveHistory = latestMoves ?? moves;

      const calcSideAccuracy = (side: PlayerColor): number => {
        const sideMoves = moveHistory.filter((m) => m.color === side);
        if (sideMoves.length === 0) return 95;
        let totalPenalty = 0;
        for (let i = 0; i < sideMoves.length; i++) {
          const curr = sideMoves[i];
          const prevIdx = moveHistory.findIndex((m) => m.ply === curr.ply) - 1;
          const prevEval = prevIdx >= 0 ? moveHistory[prevIdx].evalCp : 20;
          const loss =
            side === 'w' ? Math.max(0, prevEval - curr.evalCp) : Math.max(0, curr.evalCp - prevEval);
          totalPenalty += Math.min(35, loss / 18);
        }
        return Math.max(42, Math.min(99, Math.round(98 - totalPenalty / sideMoves.length)));
      };

      const accuracyWhite = calcSideAccuracy('w');
      const accuracyBlack = calcSideAccuracy('b');
      const playerAccuracy = playerColor === 'w' ? accuracyWhite : accuracyBlack;

      const isPlayerWin = winner === playerColor;
      const isDraw = winner === 'draw';
      soundEngine.playGameEnd(matchMode === 'local' ? !isDraw : isPlayerWin);

      let eloDelta = 0;
      let newElo = profile.elo;
      let tournamentAdvanced = false;
      let tournamentChampion = false;
      let leaguePrizeWon = 0;

      if (matchMode !== 'local' && matchMode !== 'friend') {
        const opponentElo = selectedRival.elo;
        const opponentName = selectedRival.name;

        const score: 1 | 0.5 | 0 = isDraw ? 0.5 : isPlayerWin ? 1 : 0;
        eloDelta = calculateEloDelta(profile.elo, opponentElo, score);
        newElo = Math.max(400, profile.elo + eloDelta);

        // Update Knockout Cup if in 'tournament' mode
        if (matchMode === 'tournament' && tournament && activeBracketMatchId) {
          if (isDraw) {
            setStatusBanner('Knockout game drawn — rematch required to decide round.');
          } else {
            const currentRound = tournament.currentRound;
            const updatedMatches = tournament.matches.map((m) => ({ ...m }));
            const activeMatch = updatedMatches.find((m) => m.id === activeBracketMatchId);

            if (activeMatch && activeMatch.playerA && activeMatch.playerB) {
              const playerParticipant = activeMatch.playerA.isPlayer
                ? activeMatch.playerA
                : activeMatch.playerB;
              const rivalParticipant = activeMatch.playerA.isPlayer
                ? activeMatch.playerB
                : activeMatch.playerA;

              activeMatch.winnerId = isPlayerWin ? playerParticipant.id : rivalParticipant.id;
              activeMatch.scoreLabel = isPlayerWin ? '1 - 0' : '0 - 1';

              for (const m of updatedMatches) {
                if (m.round === currentRound && !m.winnerId && m.playerA && m.playerB) {
                  m.winnerId = simulateAiBracketMatch(m.playerA, m.playerB);
                  m.scoreLabel = m.winnerId === m.playerA.id ? '1 - 0' : '0 - 1';
                }
              }

              if (currentRound < 3) {
                const nextRound = (currentRound + 1) as 2 | 3;
                const currRoundMatches = updatedMatches
                  .filter((m) => m.round === currentRound)
                  .sort((a, b) => a.slot - b.slot);
                const nextRoundMatches = updatedMatches
                  .filter((m) => m.round === nextRound)
                  .sort((a, b) => a.slot - b.slot);

                for (let i = 0; i < nextRoundMatches.length; i++) {
                  const m1 = currRoundMatches[i * 2];
                  const m2 = currRoundMatches[i * 2 + 1];
                  nextRoundMatches[i].playerA =
                    m1.winnerId === m1.playerA?.id ? m1.playerA : m1.playerB;
                  nextRoundMatches[i].playerB =
                    m2.winnerId === m2.playerA?.id ? m2.playerA : m2.playerB;
                }
              }

              if (isPlayerWin) {
                if (currentRound === 3) {
                  tournamentChampion = true;
                  eloDelta += 50;
                  newElo += 50;
                  setTournament({
                    ...tournament,
                    status: 'champion',
                    matches: updatedMatches,
                  });
                } else {
                  tournamentAdvanced = true;
                  setTournament({
                    ...tournament,
                    currentRound: (currentRound + 1) as 2 | 3,
                    matches: updatedMatches,
                    playerColorNext: tournament.playerColorNext === 'w' ? 'b' : 'w',
                  });
                }
              } else {
                setTournament({
                  ...tournament,
                  status: 'eliminated',
                  matches: updatedMatches,
                });
              }
            }
          }
        }

        const record: MatchRecord = {
          id: `${Date.now()}`,
          dateIso: new Date().toISOString(),
          mode: matchMode,
          opponentName,
          opponentElo,
          playerColor,
          timeControlLabel: activeTimeControl.label,
          opening: detectOpeningName(chess.history()),
          result: isDraw ? 'draw' : isPlayerWin ? 'win' : 'loss',
          reason,
          eloDelta,
          movesCount: Math.ceil(chess.history().length / 2),
          accuracy: playerAccuracy,
        };

        setProfile((prev) => {
          const next = {
            ...prev,
            elo: Math.max(400, prev.elo + eloDelta),
            peakElo: Math.max(prev.peakElo, Math.max(400, prev.elo + eloDelta)),
            wins: prev.wins + (isPlayerWin ? 1 : 0),
            losses: prev.losses + (!isDraw && !isPlayerWin ? 1 : 0),
            draws: prev.draws + (isDraw ? 1 : 0),
            streak: isPlayerWin ? prev.streak + 1 : 0,
            trophies:
              prev.trophies +
              (tournamentChampion || leaguePrizeWon === LEAGUE_PRIZES.first ? 1 : 0),
            history: [record, ...prev.history].slice(0, 40),
          };
          if (auth.currentUser) {
            authFetch('/api/account/profile', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                name: next.name,
                elo: next.elo,
                peakElo: next.peakElo,
                wins: next.wins,
                losses: next.losses,
                draws: next.draws,
                streak: next.streak,
                trophies: next.trophies,
              }),
            }).catch(() => {});
            authFetch('/api/account/matches', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...record,
                whiteName: prev.name,
              }),
            }).catch(() => {});
          }
          return next;
        });
      }

      setGameResult({
        winner,
        reason,
        eloDelta,
        newElo,
        accuracyWhite,
        accuracyBlack,
        tournamentAdvanced,
        tournamentChampion,
        leaguePrizeWon,
      });
      setShowPostMatchModal(true);
    },
    [
      activeBracketMatchId,
      activeTimeControl.label,
      matchMode,
      moves,
      playerColor,
      profile.elo,
      selectedRival.elo,
      selectedRival.name,
      tournament,
    ]
  );

  // Start a local / AI / Cup match cleanly
  const startMatch = useCallback(
    (opts?: {
      mode?: MatchMode;
      rivalId?: string;
      timeControlId?: string;
      forcedColor?: PlayerColor;
      bracketMatchId?: string | null;
    }) => {
      const nextMode = opts?.mode ?? matchMode;
      const nextRivalId = opts?.rivalId ?? selectedRivalId;
      const nextTcId = opts?.timeControlId ?? selectedTimeControlId;
      const tc = TIME_CONTROLS.find((t) => t.id === nextTcId) ?? TIME_CONTROLS[3];

      let chosenColor: PlayerColor = 'w';
      if (opts?.forcedColor) {
        chosenColor = opts.forcedColor;
      } else if (nextMode === 'local') {
        chosenColor = 'w';
      } else if (preferredSide === 'random') {
        chosenColor = Math.random() < 0.5 ? 'w' : 'b';
      } else {
        chosenColor = preferredSide;
      }

      const freshChess = new Chess();
      chessRef.current = freshChess;

      setMatchMode(nextMode);
      setSelectedRivalId(nextRivalId);
      setSelectedTimeControlId(nextTcId);
      setActiveBracketMatchId(opts?.bracketMatchId ?? null);

      setPlayerColor(chosenColor);
      setBoardOrientation(chosenColor);
      setLiveFen(freshChess.fen());
      setMoves([]);
      setReviewPly(null);
      setEvalCp(20);
      setIsBotThinking(false);
      setStatusBanner(null);
      setGameResult(null);
      setShowPostMatchModal(false);

      const initialMs = tc.initialSeconds * 1000;
      setWhiteTimeMs(initialMs);
      setBlackTimeMs(initialMs);
      lastTickRef.current = Date.now();
      lowTimeAlertedRef.current = { w: false, b: false };
      setGamePhase('PLAYING');
      setActiveTab('arena');
    },
    [matchMode, preferredSide, selectedRivalId, selectedTimeControlId]
  );

  // Execute a legal move locally (AI, Cup, League, Local 2P)
  const commitMove = useCallback(
    (from: string, to: string, promotion?: PieceSymbol): boolean => {
      const chess = chessRef.current;
      const movingColor = chess.turn();
      const prevEval = evalCp;

      let moved;
      try {
        moved = chess.move({ from, to, promotion: promotion ?? 'q' });
      } catch {
        return false;
      }
      if (!moved) return false;

      const incrementMs = activeTimeControl.incrementSeconds * 1000;
      if (incrementMs > 0 && chess.history().length > 1) {
        if (movingColor === 'w') setWhiteTimeMs((t) => t + incrementMs);
        else setBlackTimeMs((t) => t + incrementMs);
      }
      lastTickRef.current = Date.now();

      const nextEval = evaluatePositionCp(chess);
      setEvalCp(nextEval);
      setLiveFen(chess.fen());
      setReviewPly(null);

      const drop = movingColor === 'w' ? prevEval - nextEval : nextEval - prevEval;
      let annotation: MoveEntry['annotation'];
      if (drop > 320) annotation = '??';
      else if (drop > 140) annotation = '?';
      else if (drop < -120 && Math.abs(prevEval) < 500) annotation = '!';

      const ply = chess.history().length;
      const entry: MoveEntry = {
        ply,
        moveNumber: Math.ceil(ply / 2),
        color: movingColor,
        san: moved.san,
        from: moved.from,
        to: moved.to,
        fenAfter: chess.fen(),
        evalCp: nextEval,
        isCapture: Boolean(moved.captured),
        isCheck: chess.inCheck(),
        isMate: chess.isCheckmate(),
        annotation,
      };

      const nextMoves = [...moves, entry];
      setMoves(nextMoves);

      if (chess.inCheck()) soundEngine.playCheck();
      else if (moved.promotion) soundEngine.playPromote();
      else if (moved.flags.includes('k') || moved.flags.includes('q')) soundEngine.playCastle();
      else if (moved.captured) soundEngine.playCapture();
      else soundEngine.playMove();

      if (matchMode === 'local' && autoFlipLocal && !chess.isGameOver()) {
        setBoardOrientation(chess.turn());
      }

      if (chess.isCheckmate()) {
        concludeGame(movingColor, 'checkmate', nextMoves);
      } else if (chess.isStalemate()) {
        concludeGame('draw', 'stalemate', nextMoves);
      } else if (chess.isThreefoldRepetition()) {
        concludeGame('draw', 'repetition', nextMoves);
      } else if (chess.isInsufficientMaterial()) {
        concludeGame('draw', 'insufficient', nextMoves);
      } else if (chess.isDraw()) {
        concludeGame('draw', 'fifty-move', nextMoves);
      }

      return true;
    },
    [activeTimeControl.incrementSeconds, autoFlipLocal, concludeGame, evalCp, matchMode, moves]
  );

  // Handle user board move (supports both local and WebSocket Friend Challenge!)
  const handleUserMove = useCallback(
    (from: string, to: string, promotion?: PieceSymbol): boolean => {
      if (gamePhase === 'GAME_OVER') return false;

      if (matchMode === 'friend' && friendRoom) {
        if (friendRoom.status !== 'playing') return false;
        const testChess = new Chess(friendRoom.fen);
        let checkMove;
        try {
          checkMove = testChess.move({ from, to, promotion: promotion ?? 'q' });
        } catch {
          return false;
        }
        if (!checkMove) return false;

        wsRef.current?.send(
          JSON.stringify({
            type: 'move:attempt',
            code: friendRoom.code,
            playerId: profile.id,
            from,
            to,
            promotion: promotion ?? 'q',
          })
        );
        return true;
      }

      if (gamePhase === 'SETUP') {
        const fresh = new Chess();
        chessRef.current = fresh;
        const initialMs = activeTimeControl.initialSeconds * 1000;
        setWhiteTimeMs(initialMs);
        setBlackTimeMs(initialMs);
        lastTickRef.current = Date.now();
        lowTimeAlertedRef.current = { w: false, b: false };
        setGamePhase('PLAYING');
      }

      return commitMove(from, to, promotion);
    },
    [
      activeTimeControl.initialSeconds,
      commitMove,
      friendRoom,
      gamePhase,
      matchMode,
      profile.id,
    ]
  );

  // Bot turn execution (Rated, Cup, League)
  useEffect(() => {
    if (gamePhase !== 'PLAYING' || matchMode === 'local' || matchMode === 'friend') return;
    const chess = chessRef.current;
    if (chess.isGameOver()) return;
    const botColor: PlayerColor = playerColor === 'w' ? 'b' : 'w';
    if (chess.turn() !== botColor) return;

    setIsBotThinking(true);
    const botRemaining = botColor === 'w' ? whiteTimeMs : blackTimeMs;
    const [minThink, maxThink] = selectedRival.thinkTimeMs;
    const baseDelay = minThink + Math.random() * (maxThink - minThink);
    const delayMs = botRemaining < 15000 ? Math.min(280, baseDelay) : baseDelay;

    const timer = window.setTimeout(() => {
      if (chessRef.current.isGameOver()) return;
      const move = selectBotMove(
        chessRef.current.fen(),
        chessRef.current.history(),
        selectedRival
      );
      setIsBotThinking(false);
      if (move) {
        commitMove(move.from, move.to, move.promotion);
      }
    }, delayMs);

    return () => window.clearTimeout(timer);
  }, [
    blackTimeMs,
    commitMove,
    gamePhase,
    liveFen,
    matchMode,
    playerColor,
    selectedRival,
    whiteTimeMs,
  ]);

  // Live 100ms clock ticker (local smoothly updates; friend mode ticks locally between server syncs)
  useEffect(() => {
    if (gamePhase !== 'PLAYING') return;
    if (matchMode === 'friend' && friendRoom?.status !== 'playing') return;
    if (matchMode === 'friend' && moves.length === 0) return;

    lastTickRef.current = Date.now();
    const interval = window.setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      const turn = chessRef.current.turn();
      if (turn === 'w') {
        setWhiteTimeMs((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next < 10000 && next > 0 && !lowTimeAlertedRef.current.w) {
            lowTimeAlertedRef.current.w = true;
            soundEngine.playLowTimeTick();
          }
          if (next <= 0 && matchMode !== 'friend') {
            window.clearInterval(interval);
            concludeGame(chessRef.current.isInsufficientMaterial() ? 'draw' : 'b', 'timeout');
          }
          return next;
        });
      } else {
        setBlackTimeMs((prev) => {
          const next = Math.max(0, prev - elapsed);
          if (next < 10000 && next > 0 && !lowTimeAlertedRef.current.b) {
            lowTimeAlertedRef.current.b = true;
            soundEngine.playLowTimeTick();
          }
          if (next <= 0 && matchMode !== 'friend') {
            window.clearInterval(interval);
            concludeGame(chessRef.current.isInsufficientMaterial() ? 'draw' : 'w', 'timeout');
          }
          return next;
        });
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [concludeGame, friendRoom?.status, gamePhase, matchMode, moves.length]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'f' || e.key === 'F') {
        setBoardOrientation((o) => (o === 'w' ? 'b' : 'w'));
      } else if (e.key === 'ArrowLeft' && moves.length > 0) {
        setReviewPly((curr) =>
          curr === null ? Math.max(0, moves.length - 1) : Math.max(0, curr - 1)
        );
      } else if (e.key === 'ArrowRight' && reviewPly !== null) {
        setReviewPly((curr) =>
          curr === null || curr + 1 >= moves.length ? null : curr + 1
        );
      } else if (e.key === 'Home' && moves.length > 0) {
        setReviewPly(0);
      } else if (e.key === 'End') {
        setReviewPly(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [moves.length, reviewPly]);

  // Resign & Draw actions
  const handleResign = () => {
    if (gamePhase !== 'PLAYING') return;
    if (matchMode === 'friend' && friendRoom) {
      wsRef.current?.send(
        JSON.stringify({
          type: 'resign',
          code: friendRoom.code,
          playerId: profile.id,
        })
      );
      return;
    }
    const losingColor = matchMode === 'local' ? chessRef.current.turn() : playerColor;
    concludeGame(losingColor === 'w' ? 'b' : 'w', 'resignation');
  };

  const handleOfferDraw = () => {
    if (gamePhase !== 'PLAYING') return;
    if (matchMode === 'friend' && friendRoom) {
      wsRef.current?.send(
        JSON.stringify({
          type: 'draw:offer',
          code: friendRoom.code,
          playerId: profile.id,
        })
      );
      setStatusBanner('Draw offer sent to opponent.');
      setTimeout(() => setStatusBanner(null), 2800);
      return;
    }
    if (matchMode === 'local') {
      concludeGame('draw', 'agreement');
      return;
    }
    const botColor = playerColor === 'w' ? 'b' : 'w';
    const accepted = shouldBotAcceptDraw(
      chessRef.current.fen(),
      botColor,
      Math.ceil(moves.length / 2)
    );
    if (accepted) {
      concludeGame('draw', 'agreement');
    } else {
      setStatusBanner(`${selectedRival.name} declined your draw offer.`);
      setTimeout(() => setStatusBanner(null), 3200);
    }
  };

  // Live Human-vs-Human World Chess League Handlers (Zero Bots)
  const handleEnterWorldLeague = useCallback(
    async (difficulty: LeagueDifficulty) => {
      setWorldLeagueError(null);
      const tier = LEAGUE_TIERS.find((t) => t.id === difficulty) ?? LEAGUE_TIERS[0];
      if (profile.walletBalance < tier.entryFee) {
        setShowWalletModal(true);
        return;
      }
      try {
        if (!auth.currentUser) {
          await signInWithGoogle();
        }
        const res = await authFetch('/api/wallet/debit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId: profile.id,
            amount: tier.entryFee,
            method: 'World Chess League',
            note: `World Chess League (${tier.label}) Entry`,
            clientBalance: profile.walletBalance,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          setWorldLeagueError(data.error || 'Could not process entry fee.');
          if (res.status === 400) setShowWalletModal(true);
          return;
        }
        const tx = data.transaction as WalletTransaction;
        if (typeof data.balance === 'number') {
          syncServerWallet(data.balance, [tx, ...profile.transactions].slice(0, 60));
        } else {
          recordWalletTransaction(tx, -tier.entryFee);
        }

        const ws = await ensureWebSocket();
        ws.send(
          JSON.stringify({
            type: 'world:join',
            playerId: profile.id,
            name: profile.name,
            elo: profile.elo,
            tierId: tier.id,
            entryFeePaid: tier.entryFee,
          })
        );
        worldCreditedRef.current = false;
      } catch {
        setWorldLeagueError('Unable to reach World Chess League server.');
      }
    },
    [
      ensureWebSocket,
      profile.elo,
      profile.id,
      profile.name,
      profile.transactions,
      profile.walletBalance,
      recordWalletTransaction,
      syncServerWallet,
    ]
  );

  const handleFindWorldMatch = useCallback(
    async (timeControlId: string) => {
      setWorldLeagueError(null);
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'world:find_match',
          playerId: profile.id,
          timeControlId,
        })
      );
    },
    [ensureWebSocket, profile.id]
  );

  const handleCancelWorldWait = useCallback(async () => {
    const ws = await ensureWebSocket();
    ws.send(
      JSON.stringify({
        type: 'world:cancel_wait',
        playerId: profile.id,
      })
    );
  }, [ensureWebSocket, profile.id]);

  const handleChallengeWorldPlayer = useCallback(
    async (targetPlayerId: string, timeControlId: string) => {
      setWorldLeagueError(null);
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'world:challenge_player',
          playerId: profile.id,
          targetPlayerId,
          timeControlId,
        })
      );
    },
    [ensureWebSocket, profile.id]
  );

  const handleSettleWorldPrizes = useCallback(async () => {
    const ws = await ensureWebSocket();
    ws.send(JSON.stringify({ type: 'world:settle_prizes' }));

    const rankIdx = worldLeagueLive.players.findIndex((p) => p.playerId === profile.id);
    if (rankIdx >= 0 && rankIdx <= 2 && !worldCreditedRef.current) {
      worldCreditedRef.current = true;
      const prizeAmt =
        rankIdx === 0
          ? worldLeagueLive.prizes.first
          : rankIdx === 1
          ? worldLeagueLive.prizes.second
          : worldLeagueLive.prizes.third;
      if (prizeAmt > 0) {
        try {
          const res = await authFetch('/api/wallet/credit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              playerId: profile.id,
              amount: prizeAmt,
              method: 'World Chess League',
              note: `Rank #${rankIdx + 1} Prize (World Chess League)`,
            }),
          });
          const data = await res.json();
          if (res.ok && data.ok && data.transaction) {
            recordWalletTransaction(data.transaction as WalletTransaction, prizeAmt);
          }
        } catch {
          // fallback credit locally if offline
        }
      }
    }
  }, [ensureWebSocket, profile.id, recordWalletTransaction, worldLeagueLive]);

  // Knockout Cup creation
  const handleStartTournament = () => {
    const qualifiers: BracketParticipant[] = [
      {
        id: 'player',
        name: profile.name,
        title: 'Challenger',
        elo: profile.elo,
        isPlayer: true,
      },
      ...RIVALS.map((r) => ({
        id: r.id,
        name: r.name,
        title: r.title,
        elo: r.elo,
        avatarUrl: r.avatarUrl,
        isPlayer: false,
        rivalId: r.id,
      })),
      {
        id: 'qual-lucas',
        name: 'Lucas Vance',
        title: 'Qualifier',
        elo: 1120,
        isPlayer: false,
        rivalId: 'aarav',
      },
      {
        id: 'qual-sofia',
        name: 'Sofia Chen',
        title: 'Qualifier',
        elo: 1410,
        isPlayer: false,
        rivalId: 'elena',
      },
    ];

    const seeded = [...qualifiers].sort((a, b) => a.elo - b.elo);
    const byId = new Map(qualifiers.map((p) => [p.id, p]));
    const playerEntry = byId.get('player')!;
    const others = seeded.filter((p) => !p.isPlayer);

    setTournament({
      id: `cup-${Date.now()}`,
      name: 'Grandmaster Knockout Cup',
      timeControlId: tournamentTimeControlId,
      status: 'active',
      currentRound: 1,
      matches: [
        { id: 'qf-1', round: 1, slot: 0, playerA: playerEntry, playerB: others[0], winnerId: null },
        { id: 'qf-2', round: 1, slot: 1, playerA: others[1], playerB: others[2], winnerId: null },
        { id: 'qf-3', round: 1, slot: 2, playerA: others[3], playerB: others[4], winnerId: null },
        { id: 'qf-4', round: 1, slot: 3, playerA: others[5], playerB: others[6], winnerId: null },
        { id: 'sf-1', round: 2, slot: 0, playerA: null, playerB: null, winnerId: null },
        { id: 'sf-2', round: 2, slot: 1, playerA: null, playerB: null, winnerId: null },
        { id: 'final-1', round: 3, slot: 0, playerA: null, playerB: null, winnerId: null },
      ],
      playerColorNext: 'w',
    });
  };

  const handlePlayBracketMatch = (match: BracketMatch) => {
    if (!tournament) return;
    const opponent = match.playerA?.isPlayer ? match.playerB : match.playerA;
    if (!opponent) return;
    startMatch({
      mode: 'tournament',
      rivalId: opponent.rivalId ?? 'viktor',
      timeControlId: tournament.timeControlId,
      forcedColor: tournament.playerColorNext,
      bracketMatchId: match.id,
    });
  };

  const handleCopyFen = () => {
    navigator.clipboard?.writeText(displayedFen).catch(() => {});
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 1600);
  };

  const handleCopyFriendInvite = () => {
    if (!friendRoom) return;
    const link = `${window.location.origin}${window.location.pathname}?room=${friendRoom.code}`;
    navigator.clipboard?.writeText(link).catch(() => {});
    setCopiedRoomLink(true);
    setTimeout(() => setCopiedRoomLink(false), 1800);
  };

  const handleSendGlobalChat = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    try {
      const ws = await ensureWebSocket();
      const p = profileRef.current;
      ws.send(
        JSON.stringify({
          type: 'arena:chat_send',
          playerId: p.id,
          name: p.name,
          elo: p.elo,
          text: trimmed,
        })
      );
    } catch {
      // handled by offline indicator
    }
  }, [ensureWebSocket]);

  const handleSendRoomChat = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!friendRoom || !trimmed) return;
    wsRef.current?.send(
      JSON.stringify({
        type: 'chat:send',
        code: friendRoom.code,
        playerId: profileRef.current.id,
        name: profileRef.current.name,
        text: trimmed,
      })
    );
  }, [friendRoom]);

  const topColor: PlayerColor = boardOrientation === 'w' ? 'b' : 'w';
  const bottomColor: PlayerColor = boardOrientation;

  const getParticipantCardProps = (color: PlayerColor) => {
    const isWhite = color === 'w';
    const captured = isWhite ? materialInfo.capturedByWhite : materialInfo.capturedByBlack;
    const advantage = isWhite ? materialInfo.advantageWhite : -materialInfo.advantageWhite;
    const timeRemainingMs = isWhite ? whiteTimeMs : blackTimeMs;
    const isActiveTurn = gamePhase === 'PLAYING' && chessRef.current.turn() === color;

    if (matchMode === 'friend' && friendRoom) {
      const slot = isWhite ? friendRoom.white : friendRoom.black;
      const instSubtitle = friendRoom.leagueMeta
        ? isWhite
          ? friendRoom.leagueMeta.whiteInstitution || friendRoom.leagueMeta.leagueTitle
          : friendRoom.leagueMeta.blackInstitution || friendRoom.leagueMeta.leagueTitle
        : slot
        ? slot.connected
          ? 'Live Connected'
          : 'Reconnecting'
        : 'Invite via Link';
      return {
        name: slot ? slot.name : 'Waiting for Opponent...',
        subtitle: instSubtitle,
        elo: slot ? slot.elo : 1200,
        avatarUrl: undefined,
        color,
        timeRemainingMs,
        isActiveTurn: friendRoom.status === 'playing' && chessRef.current.turn() === color,
        isThinking: false,
        isGameOver: gamePhase === 'GAME_OVER',
        capturedPieces: captured,
        materialAdvantage: advantage,
      };
    }

    if (matchMode === 'local') {
      return {
        name: isWhite ? 'Player 1' : 'Player 2',
        subtitle: 'Over-the-Board',
        elo: profile.elo,
        avatarUrl: undefined,
        color,
        timeRemainingMs,
        isActiveTurn,
        isThinking: false,
        isGameOver: gamePhase === 'GAME_OVER',
        capturedPieces: captured,
        materialAdvantage: advantage,
      };
    }

    if (color === playerColor) {
      return {
        name: profile.name,
        subtitle: 'Challenger',
        elo: profile.elo,
        avatarUrl: undefined,
        color,
        timeRemainingMs,
        isActiveTurn,
        isThinking: false,
        isGameOver: gamePhase === 'GAME_OVER',
        capturedPieces: captured,
        materialAdvantage: advantage,
      };
    }

    return {
      name: selectedRival.name,
      subtitle: `${selectedRival.title} • ${selectedRival.style}`,
      elo: selectedRival.elo,
      avatarUrl: selectedRival.avatarUrl,
      color,
      timeRemainingMs,
      isActiveTurn,
      isThinking: isBotThinking && chessRef.current.turn() === color,
      isGameOver: gamePhase === 'GAME_OVER',
      capturedPieces: captured,
      materialAdvantage: advantage,
    };
  };

  const opponentDisplayName =
    matchMode === 'local'
      ? 'Player 2'
      : matchMode === 'friend' && friendRoom
      ? (playerColor === 'w' ? friendRoom.black?.name : friendRoom.white?.name) || 'Friend'
      : selectedRival.name;

  const incomingDrawOffer =
    matchMode === 'friend' &&
    friendRoom?.status === 'playing' &&
    friendRoom.drawOfferBy &&
    friendRoom.drawOfferBy !== playerColor;

  const NAV_ITEMS: { id: AppTab; label: string; shortLabel: string }[] = [
    { id: 'arena', label: 'Arena', shortLabel: 'Arena' },
    { id: 'league', label: 'World League', shortLabel: 'World' },
    { id: 'school', label: 'School League', shortLabel: 'Schools' },
    { id: 'college', label: 'College League', shortLabel: 'Colleges' },
    { id: 'company', label: 'Companies League', shortLabel: 'Companies' },
    { id: 'challenge', label: 'Challenge', shortLabel: 'Challenge' },
    { id: 'tournament', label: 'Cup', shortLabel: 'Cup' },
    { id: 'ladder', label: 'Ladder', shortLabel: 'Ladder' },
    { id: 'rules', label: 'Rules', shortLabel: 'Rules' },
  ];

  return (
    <div className="min-h-screen flex flex-col text-amber-50">
      {/* Desktop & Mobile Responsive Header */}
      <header className="border-b border-amber-400/20 bg-[#1a0b03]/92 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3 sm:gap-5">
          {/* Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('arena')}
            className="text-base sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 bg-clip-text text-transparent whitespace-nowrap shrink-0"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            Grandmaster Arena
          </button>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-4 xl:gap-5 text-xs xl:text-sm font-medium overflow-x-auto">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`py-5 border-b-2 transition-colors whitespace-nowrap shrink-0 ${
                  activeTab === item.id
                    ? 'border-amber-400 text-amber-200 font-semibold'
                    : 'border-transparent text-amber-100/70 hover:text-amber-50'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Account & Primary Wallet CTA */}
          <div className="flex items-center gap-2 shrink-0">
            {authUser ? (
              <button
                type="button"
                onClick={handleSignOut}
                title={`Signed in as ${authUser.email || authUser.displayName || 'Player'} — Click to sign out`}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#2a1306] hover:bg-[#3a1a09] border border-amber-400/25 text-amber-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                <span className="hidden sm:inline max-w-[100px] truncate">
                  {authUser.displayName || profile.name}
                </span>
                <LogOut className="w-3 h-3 text-amber-300/80" aria-hidden="true" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSignIn}
                disabled={authBusy}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg bg-[#2a1306] hover:bg-[#3a1a09] border border-amber-400/30 text-amber-100 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 disabled:opacity-60"
              >
                <LogIn className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                <span>{authBusy ? 'Signing In...' : 'Sign In'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setShowWalletModal(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap shrink-0 shadow-md"
            >
              <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4" aria-hidden="true" />
              <span className="font-mono tabular-nums">
                ₹{profile.walletBalance.toLocaleString('en-IN')}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Responsive Sub-Navigation Bar */}
        <nav className="lg:hidden border-t border-amber-400/15 px-2.5 py-2 flex items-center gap-1.5 overflow-x-auto arena-scroll bg-[#160902]/95">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                activeTab === item.id
                  ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-bold'
                  : 'bg-[#241005] text-amber-100/80 border border-amber-400/15'
              }`}
            >
              {item.shortLabel}
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {activeTab === 'arena' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 lg:py-7">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-start">
              {/* Left Column (Eval Bar + 3D/2D Board + Dual Clocks) */}
              <div className="lg:col-span-7 flex gap-2 sm:gap-3 justify-center">
                <div className="hidden sm:block">
                  <EvalBar evalCp={evalCp} orientation={boardOrientation} />
                </div>

                <div className="w-full max-w-[600px] space-y-2.5">
                  {/* Compact Board Mode & Theme Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-[#241005]/95 border border-amber-400/20">
                      <button
                        type="button"
                        onClick={() => setBoardDimension('3d')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          boardDimension === '3d'
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-bold'
                            : 'text-amber-100/80 hover:text-amber-50'
                        }`}
                      >
                        <Box className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>3D Board</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setBoardDimension('2d')}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors ${
                          boardDimension === '2d'
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-bold'
                            : 'text-amber-100/80 hover:text-amber-50'
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>2D Classic</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {BOARD_THEMES.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => setBoardThemeId(t.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors ${
                            boardThemeId === t.id
                              ? 'bg-amber-500/25 border-amber-400 text-amber-100 font-semibold'
                              : 'bg-[#241005]/95 border-amber-400/20 text-amber-200/70 hover:text-amber-50'
                          }`}
                        >
                          {t.name.split(' ')[1]}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Top Clock Card */}
                  <MatchClockCard {...getParticipantCardProps(topColor)} />

                  {/* Friend Room Invite Bar when waiting */}
                  {matchMode === 'friend' && friendRoom && friendRoom.status === 'waiting' && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-lg bg-amber-500/12 border border-amber-500/40 text-xs text-amber-100">
                      <span>
                        Waiting for opponent in Room{' '}
                        <strong className="font-mono text-amber-300">{friendRoom.code}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyFriendInvite}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-amber-500 text-slate-950 font-bold hover:bg-amber-400 transition-colors whitespace-nowrap"
                      >
                        {copiedRoomLink ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Invite Link Copied</span>
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5" />
                            <span>Copy Friend Invite Link</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Review Indicator */}
                  {reviewPly !== null && (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-md bg-amber-500/12 border border-amber-500/35 text-xs text-amber-200">
                      <span>
                        Inspecting position at {reviewPly === 0 ? 'Start' : `Ply ${reviewPly}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setReviewPly(null)}
                        className="font-semibold underline hover:text-white"
                      >
                        Return to Live
                      </button>
                    </div>
                  )}

                  {/* 3D or 2D Chessboard */}
                  {boardDimension === '3d' ? (
                    <ChessBoard3D
                      fen={displayedFen}
                      orientation={boardOrientation}
                      themeId={boardThemeId}
                      canInteract={
                        gamePhase !== 'GAME_OVER' &&
                        !isBotThinking &&
                        (matchMode !== 'friend' || friendRoom?.status === 'playing')
                      }
                      playerTurnColor={
                        gamePhase === 'SETUP'
                          ? preferredSide === 'b'
                            ? 'b'
                            : 'w'
                          : matchMode === 'local'
                          ? 'both'
                          : playerColor
                      }
                      lastMove={displayedLastMove}
                      isReviewing={reviewPly !== null}
                      onAttemptMove={handleUserMove}
                    />
                  ) : (
                    <ChessBoard
                      fen={displayedFen}
                      orientation={boardOrientation}
                      theme={boardTheme}
                      canInteract={
                        gamePhase !== 'GAME_OVER' &&
                        !isBotThinking &&
                        (matchMode !== 'friend' || friendRoom?.status === 'playing')
                      }
                      playerTurnColor={
                        gamePhase === 'SETUP'
                          ? preferredSide === 'b'
                            ? 'b'
                            : 'w'
                          : matchMode === 'local'
                          ? 'both'
                          : playerColor
                      }
                      lastMove={displayedLastMove}
                      isReviewing={reviewPly !== null}
                      onAttemptMove={handleUserMove}
                    />
                  )}

                  {/* Bottom Clock Card */}
                  <MatchClockCard {...getParticipantCardProps(bottomColor)} />
                </div>
              </div>

              {/* Right Column: Setup OR Live Match Inspector + Always-On Real WebSocket Chat */}
              <div className="lg:col-span-5 space-y-4">
                {gamePhase === 'SETUP' ? (
                  <div className="rounded-2xl bg-[#241005]/95 border border-amber-400/25 p-5 sm:p-6 space-y-5 shadow-xl">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-amber-300 font-semibold">
                        <span>Normal Arena (Solo & 2P)</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{profile.elo} Elo</span>
                      </div>
                      <h1
                        className="text-2xl font-bold text-amber-50"
                        style={{ fontFamily: 'var(--font-display)' }}
                      >
                        Play vs Computer or 2P Local
                      </h1>
                    </div>

                    {/* Mode Segmented Selector */}
                    <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#180a03] border border-amber-400/20">
                      <button
                        type="button"
                        onClick={() => setMatchMode('rated')}
                        className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                          matchMode === 'rated'
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-bold'
                            : 'text-amber-200/75 hover:text-amber-50'
                        }`}
                      >
                        Play vs Computer
                      </button>
                      <button
                        type="button"
                        onClick={() => setMatchMode('local')}
                        className={`py-2 px-3 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                          matchMode === 'local'
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-stone-950 font-bold'
                            : 'text-amber-200/75 hover:text-amber-50'
                        }`}
                      >
                        2P Pass & Play
                      </button>
                    </div>

                    {matchMode === 'rated' ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-amber-200/80">
                          <span>Computer Difficulty (5 Levels)</span>
                          <span className="font-medium text-amber-300">
                            Easy · Moderate · Hard · Hardcore · Expert
                          </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                          {COMPUTER_LEVELS.map((lvl) => {
                            const isSelected = selectedRivalId === lvl.rivalId;
                            return (
                              <button
                                key={lvl.id}
                                type="button"
                                onClick={() => setSelectedRivalId(lvl.rivalId)}
                                className={`p-2.5 rounded-lg border text-left transition-colors ${
                                  isSelected
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                                    : 'bg-[#180a03] border-amber-400/15 text-amber-100/85 hover:border-amber-400/45'
                                }`}
                              >
                                <div className="text-xs font-bold">{lvl.label}</div>
                                <div className="text-[10px] font-mono tabular-nums text-amber-300 mt-0.5">
                                  {lvl.eloLabel}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        {/* Selected AI Challenger Summary Card */}
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-[#180a03] border border-amber-400/20">
                          <img
                            src={selectedRival.avatarUrl}
                            alt={selectedRival.name}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded-md object-cover border border-amber-400/30 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-amber-50 truncate">
                                {selectedRival.name}
                              </span>
                              <span className="text-xs font-mono tabular-nums font-semibold text-amber-300 shrink-0">
                                {selectedRival.elo} Elo
                              </span>
                            </div>
                            <div className="text-xs text-amber-200/80 truncate">
                              {selectedRival.title} · {selectedRival.style}
                            </div>
                            <div className="text-[11px] text-amber-200/55 truncate mt-0.5">
                              {selectedRival.tagline}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-[#180a03] border border-amber-400/15 space-y-2.5">
                        <p className="text-xs text-amber-100/85 leading-relaxed">
                          Face-to-face timed match on one screen. Both sides play with full tournament rules and clocks.
                        </p>
                        <label className="flex items-center gap-2 text-xs text-amber-100/85 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoFlipLocal}
                            onChange={(e) => setAutoFlipLocal(e.target.checked)}
                            className="rounded border-amber-400/30 bg-[#241005] accent-amber-400"
                          />
                          <span>Auto-flip board after each turn</span>
                        </label>
                      </div>
                    )}

                    {/* Time Control Grid */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs text-amber-200/80">
                        <span>Time Control</span>
                        <span>{activeTimeControl.category}</span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        {TIME_CONTROLS.map((tc) => (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => {
                              setSelectedTimeControlId(tc.id);
                              setWhiteTimeMs(tc.initialSeconds * 1000);
                              setBlackTimeMs(tc.initialSeconds * 1000);
                            }}
                            className={`py-2 px-2 rounded-md border text-center transition-colors ${
                              selectedTimeControlId === tc.id
                                ? 'bg-amber-500/25 border-amber-400 text-amber-100'
                                : 'bg-[#180a03] border-amber-400/15 text-amber-100/80 hover:border-amber-400/40'
                            }`}
                          >
                            <div className="text-xs font-mono font-bold">{tc.label}</div>
                            <div className="text-[10px] text-amber-200/65">{tc.category}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {matchMode === 'rated' && (
                      <div className="space-y-2">
                        <span className="text-xs text-amber-200/80 block">Play As</span>
                        <div className="grid grid-cols-3 gap-2">
                          {(
                            [
                              { id: 'w', label: 'White' },
                              { id: 'random', label: 'Random' },
                              { id: 'b', label: 'Black' },
                            ] as const
                          ).map((side) => (
                            <button
                              key={side.id}
                              type="button"
                              onClick={() => {
                                setPreferredSide(side.id);
                                if (side.id !== 'random') {
                                  setBoardOrientation(side.id);
                                  setPlayerColor(side.id);
                                }
                              }}
                              className={`py-2 px-3 rounded-md border text-xs font-medium transition-colors ${
                                preferredSide === side.id
                                  ? 'bg-amber-500/25 border-amber-400 text-amber-50'
                                  : 'bg-[#180a03] border-amber-400/15 text-amber-200/75 hover:text-amber-50'
                              }`}
                            >
                              {side.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Primary & Secondary Arena Actions */}
                    <div className="space-y-2.5 pt-1">
                      <button
                        type="button"
                        onClick={() => startMatch()}
                        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-stone-950 text-sm font-bold transition-colors shadow-lg"
                      >
                        <Play className="w-4 h-4" aria-hidden="true" />
                        <span>
                          {matchMode === 'local'
                            ? `Start 2P Match (${activeTimeControl.label})`
                            : `Start Match vs ${selectedRival.name}`}
                        </span>
                      </button>

                      <div className="grid grid-cols-2 gap-2.5">
                        <button
                          type="button"
                          onClick={() => setActiveTab('challenge')}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/20 text-xs font-semibold text-amber-100 transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5 text-amber-300" aria-hidden="true" />
                          <span>Challenge Friend</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab('league')}
                          className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#180a03] hover:bg-[#311507] border border-amber-400/20 text-xs font-semibold text-amber-100 transition-colors"
                        >
                          <Globe2 className="w-3.5 h-3.5 text-emerald-300" aria-hidden="true" />
                          <span>World League ₹50k</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Active / Completed Match Inspector */
                  <div className="rounded-2xl bg-[#241005]/95 border border-amber-400/25 overflow-hidden flex flex-col shadow-xl">
                    <div className="p-4 border-b border-amber-400/20 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs text-amber-200/75">
                        <span className="font-semibold text-amber-300">
                          {matchMode === 'friend'
                            ? friendRoom?.leagueMeta
                              ? `${friendRoom.leagueMeta.leagueTitle} · ${friendRoom.code}`
                              : `Friend Room · ${friendRoom?.code ?? ''}`
                            : matchMode === 'tournament'
                            ? 'Knockout Cup'
                            : matchMode === 'local'
                            ? 'Local 2P Match'
                            : 'Rated Computer Match'}
                        </span>
                        <span className="font-mono">
                          {activeTimeControl.label} {activeTimeControl.category}
                        </span>
                      </div>
                      <div className="text-sm font-semibold text-amber-50 truncate">
                        {openingName}
                      </div>
                    </div>

                    {incomingDrawOffer && (
                      <div className="px-4 py-2.5 bg-amber-500/15 border-b border-amber-500/35 flex items-center justify-between gap-2">
                        <span className="text-xs text-amber-100 font-medium">
                          Opponent offers a draw
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              wsRef.current?.send(
                                JSON.stringify({
                                  type: 'draw:respond',
                                  code: friendRoom?.code,
                                  playerId: profile.id,
                                  accept: true,
                                })
                              )
                            }
                            className="px-2.5 py-1 rounded bg-emerald-500 text-slate-950 text-xs font-bold"
                          >
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              wsRef.current?.send(
                                JSON.stringify({
                                  type: 'draw:respond',
                                  code: friendRoom?.code,
                                  playerId: profile.id,
                                  accept: false,
                                })
                              )
                            }
                            className="px-2.5 py-1 rounded bg-[#2e1508] hover:bg-[#3e1d0b] text-amber-100 text-xs font-medium"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    )}

                    {statusBanner && (
                      <div className="px-4 py-2 bg-amber-500/12 border-b border-amber-500/25 text-xs text-amber-200">
                        {statusBanner}
                      </div>
                    )}

                    {/* Algebraic Move Notation */}
                    <div className="h-[250px] overflow-y-auto arena-scroll p-3 bg-[#180a03]">
                      {moveRows.length === 0 ? (
                        <div className="h-full flex items-center justify-center text-xs text-amber-200/60 text-center px-4">
                          {matchMode === 'friend' && friendRoom?.status === 'waiting'
                            ? 'Share the challenge link with your friend to begin the match.'
                            : playerColor === 'w'
                            ? 'Make your opening move on the board to start the clock.'
                            : `${opponentDisplayName} is preparing the opening move...`}
                        </div>
                      ) : (
                        <table className="w-full text-xs font-mono tabular-nums border-collapse">
                          <tbody>
                            {moveRows.map((row) => (
                              <tr
                                key={row.moveNumber}
                                className="border-b border-amber-400/10 last:border-none"
                              >
                                <td className="py-1.5 px-2 text-amber-200/50 w-10">
                                  {row.moveNumber}.
                                </td>
                                <td className="py-1 px-1 w-1/2">
                                  {row.white && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReviewPly(
                                          row.white!.ply === moves.length ? null : row.white!.ply
                                        )
                                      }
                                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                                        (reviewPly === null && row.white.ply === moves.length) ||
                                        reviewPly === row.white.ply
                                          ? 'bg-amber-500/25 text-amber-100 font-semibold'
                                          : 'text-amber-50 hover:bg-amber-400/10'
                                      }`}
                                    >
                                      {row.white.san}
                                      {row.white.annotation && (
                                        <span
                                          className={`ml-1 ${
                                            row.white.annotation === '!'
                                              ? 'text-emerald-300'
                                              : 'text-red-300'
                                          }`}
                                        >
                                          {row.white.annotation}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </td>
                                <td className="py-1 px-1 w-1/2">
                                  {row.black && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setReviewPly(
                                          row.black!.ply === moves.length ? null : row.black!.ply
                                        )
                                      }
                                      className={`w-full text-left px-2 py-1 rounded transition-colors ${
                                        (reviewPly === null && row.black.ply === moves.length) ||
                                        reviewPly === row.black.ply
                                          ? 'bg-amber-500/25 text-amber-100 font-semibold'
                                          : 'text-amber-50 hover:bg-amber-400/10'
                                      }`}
                                    >
                                      {row.black.san}
                                      {row.black.annotation && (
                                        <span
                                          className={`ml-1 ${
                                            row.black.annotation === '!'
                                              ? 'text-emerald-300'
                                              : 'text-red-300'
                                          }`}
                                        >
                                          {row.black.annotation}
                                        </span>
                                      )}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>

                    {/* Stepper & Quick Controls */}
                    <div className="flex items-center justify-between px-3 py-2 border-t border-b border-amber-400/20 bg-[#1c0c04]">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setReviewPly(0)}
                          disabled={moves.length === 0}
                          className="p-1.5 rounded text-slate-300 hover:bg-white/8 disabled:opacity-30"
                          aria-label="First move"
                        >
                          <ChevronFirst className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReviewPly((curr) =>
                              curr === null ? Math.max(0, moves.length - 1) : Math.max(0, curr - 1)
                            )
                          }
                          disabled={moves.length === 0 || reviewPly === 0}
                          className="p-1.5 rounded text-slate-300 hover:bg-white/8 disabled:opacity-30"
                          aria-label="Previous move"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setReviewPly((curr) =>
                              curr === null || curr + 1 >= moves.length ? null : curr + 1
                            )
                          }
                          disabled={reviewPly === null}
                          className="p-1.5 rounded text-slate-300 hover:bg-white/8 disabled:opacity-30"
                          aria-label="Next move"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReviewPly(null)}
                          disabled={reviewPly === null}
                          className="p-1.5 rounded text-slate-300 hover:bg-white/8 disabled:opacity-30"
                          aria-label="Live position"
                        >
                          <ChevronLast className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setBoardOrientation((o) => (o === 'w' ? 'b' : 'w'))}
                          className="p-1.5 rounded text-slate-300 hover:bg-white/8"
                          title="Flip board (F)"
                          aria-label="Flip board"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSoundEnabled((s) => !s)}
                          className="p-1.5 rounded text-slate-300 hover:bg-white/8"
                          title={soundEnabled ? 'Mute sound' : 'Enable sound'}
                          aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
                        >
                          {soundEnabled ? (
                            <Volume2 className="w-4 h-4" />
                          ) : (
                            <VolumeX className="w-4 h-4 text-slate-500" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyFen}
                          className="p-1.5 rounded text-slate-300 hover:bg-white/8"
                          title="Copy FEN"
                          aria-label="Copy FEN"
                        >
                          {copiedFen ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Match Actions */}
                    <div className="p-4 space-y-3">
                      {gamePhase === 'PLAYING' ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={handleOfferDraw}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#2e1508] hover:bg-[#3e1d0b] border border-amber-400/25 text-xs font-semibold text-amber-100 transition-colors"
                          >
                            <Handshake className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{matchMode === 'local' ? 'Agree Draw' : 'Offer Draw'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleResign}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-red-950/40 hover:bg-red-900/50 border border-red-500/30 text-xs font-semibold text-red-200 transition-colors"
                          >
                            <Flag className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Resign</span>
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              if (matchMode === 'friend' && friendRoom) {
                                wsRef.current?.send(
                                  JSON.stringify({
                                    type: 'rematch:request',
                                    code: friendRoom.code,
                                    playerId: profile.id,
                                  })
                                );
                                setStatusBanner('Rematch requested.');
                                return;
                              }
                              setGamePhase('SETUP');
                            }}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>{matchMode === 'friend' ? 'Rematch' : 'New Setup'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowPostMatchModal(true)}
                            className="flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg bg-[#2e1508] hover:bg-[#3e1d0b] border border-amber-400/25 text-xs font-semibold text-amber-100 transition-colors"
                          >
                            <Award className="w-3.5 h-3.5 text-amber-400" aria-hidden="true" />
                            <span>Match Report</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Real-Time WebSocket Arena & Room Chat */}
                <LiveChatPanel
                  connected={wsConnected}
                  onlineCount={onlineCount}
                  currentPlayerId={profile.id}
                  globalMessages={globalChat}
                  roomCode={matchMode === 'friend' && friendRoom ? friendRoom.code : null}
                  roomMessages={friendRoom?.chat ?? []}
                  defaultChannel={matchMode === 'friend' && friendRoom ? 'room' : 'global'}
                  onSendGlobal={handleSendGlobalChat}
                  onSendRoom={handleSendRoomChat}
                  onReconnect={() => {
                    ensureWebSocket().catch(() => {});
                  }}
                  compact={gamePhase !== 'SETUP'}
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'league' && (
          <WorldLeagueView
            worldLeague={worldLeagueLive}
            worldError={worldLeagueError}
            profile={profile}
            selectedDifficulty={selectedLeagueTier}
            onSelectDifficulty={setSelectedLeagueTier}
            onEnterWorldLeague={handleEnterWorldLeague}
            onFindMatch={handleFindWorldMatch}
            onCancelWait={handleCancelWorldWait}
            onChallengePlayer={handleChallengeWorldPlayer}
            onSettlePrizes={handleSettleWorldPrizes}
            onOpenWallet={() => setShowWalletModal(true)}
          />
        )}

        {(activeTab === 'school' || activeTab === 'college' || activeTab === 'company') && (
          <CampusView
            division={activeTab}
            boardThemeId={boardThemeId}
            playerId={profile.id}
            playerName={profile.name}
            playerElo={profile.elo}
            leagues={moradabadLeagues}
            moradabadError={moradabadError}
            initialPassCode={initialMoradabadPass}
            onUpdatePlayerName={(newName) => setProfile((p) => ({ ...p, name: newName }))}
            onRegisterInstitution={handleRegisterMoradabadInstitution}
            onJoinMoradabadLeague={handleJoinMoradabadLeague}
            onFindMoradabadMatch={handleFindMoradabadMatch}
            onCancelMoradabadWait={handleCancelMoradabadWait}
            onChallengeMoradabadPlayer={handleChallengeMoradabadPlayer}
            onSettleMoradabadPrizes={handleSettleMoradabadPrizes}
          />
        )}

        {activeTab === 'challenge' && (
          <FriendChallengeView
            playerId={profile.id}
            playerName={profile.name}
            playerElo={profile.elo}
            activeRoomCode={friendRoom?.code ?? null}
            onCreateRoom={handleCreateFriendRoom}
            onJoinRoom={handleJoinFriendRoom}
            joinError={friendRoomError}
            wsConnected={wsConnected}
            onlineCount={onlineCount}
            globalMessages={globalChat}
            roomMessages={friendRoom?.chat ?? []}
            onSendGlobalChat={handleSendGlobalChat}
            onSendRoomChat={handleSendRoomChat}
            onReconnectWs={() => {
              ensureWebSocket().catch(() => {});
            }}
          />
        )}

        {activeTab === 'tournament' && (
          <TournamentView
            tournament={tournament}
            playerProfile={profile}
            selectedTimeControlId={tournamentTimeControlId}
            onSelectTimeControl={setTournamentTimeControlId}
            onStartTournament={handleStartTournament}
            onPlayBracketMatch={handlePlayBracketMatch}
          />
        )}

        {activeTab === 'ladder' && (
          <LadderView
            profile={profile}
            onUpdateName={(newName) => setProfile((p) => ({ ...p, name: newName }))}
            onChallengeRival={(rival) => {
              startMatch({
                mode: 'rated',
                rivalId: rival.id,
                timeControlId: selectedTimeControlId,
              });
            }}
          />
        )}

        {activeTab === 'rules' && <RulesView />}
      </main>

      {/* Post-Match Result Modal */}
      {showPostMatchModal && gameResult && (
        <PostMatchModal
          result={gameResult}
          mode={matchMode}
          playerColor={playerColor}
          opponentName={opponentDisplayName}
          openingName={openingName}
          pgnText={chessRef.current.pgn()}
          onRematch={() => {
            if (matchMode === 'friend' && friendRoom) {
              wsRef.current?.send(
                JSON.stringify({
                  type: 'rematch:request',
                  code: friendRoom.code,
                  playerId: profile.id,
                })
              );
              setShowPostMatchModal(false);
              setStatusBanner('Rematch requested — waiting for opponent.');
              return;
            }
            startMatch({
              mode: matchMode,
              rivalId: selectedRivalId,
              timeControlId: selectedTimeControlId,
              forcedColor:
                matchMode === 'tournament'
                  ? tournament?.playerColorNext
                  : playerColor === 'w'
                  ? 'b'
                  : 'w',
              bracketMatchId: activeBracketMatchId,
            });
          }}
          onReviewBoard={() => setShowPostMatchModal(false)}
          onReturnToBracket={
            matchMode === 'tournament'
              ? () => {
                  setShowPostMatchModal(false);
                  setActiveTab('tournament');
                }
              : undefined
          }
          onReturnToMoradabad={
            matchMode === 'friend' && friendRoom?.leagueMeta
              ? () => {
                  setShowPostMatchModal(false);
                  if (friendRoom.leagueMeta?.kind === 'world') {
                    setActiveTab('league');
                  } else if (friendRoom.leagueMeta?.division) {
                    setActiveTab(friendRoom.leagueMeta.division);
                  } else {
                    setActiveTab('school');
                  }
                }
              : undefined
          }
          moradabadLeagueTitle={friendRoom?.leagueMeta?.leagueTitle ?? null}
        />
      )}

      {/* Arena Wallet & Deposit Modal */}
      {showWalletModal && (
        <WalletModal
          playerId={profile.id}
          balance={profile.walletBalance}
          transactions={profile.transactions}
          onClose={() => setShowWalletModal(false)}
          onRecordTransaction={recordWalletTransaction}
          onSyncServerWallet={syncServerWallet}
        />
      )}
    </div>
  );
}
