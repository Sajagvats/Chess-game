export type PlayerColor = 'w' | 'b';

export type MatchMode = 'rated' | 'tournament' | 'league' | 'friend' | 'local';

export type TimeCategory = 'Bullet' | 'Blitz' | 'Rapid' | 'Classical';

export interface TimeControl {
  id: string;
  label: string;
  category: TimeCategory;
  initialSeconds: number;
  incrementSeconds: number;
}

export interface RivalProfile {
  id: string;
  name: string;
  title: string;
  elo: number;
  country: string;
  style: string;
  tagline: string;
  avatarUrl: string;
  searchDepth: number;
  quiescenceDepth: number;
  blunderChance: number;
  aggression: number;
  thinkTimeMs: [number, number];
}

export type BoardThemeId = 'walnut' | 'emerald' | 'slate';

export interface BoardTheme {
  id: BoardThemeId;
  name: string;
  lightSquare: string;
  darkSquare: string;
  lastMoveLight: string;
  lastMoveDark: string;
  coordLight: string;
  coordDark: string;
  frameBorder: string;
}

export interface MoveEntry {
  ply: number;
  moveNumber: number;
  color: PlayerColor;
  san: string;
  from: string;
  to: string;
  fenAfter: string;
  evalCp: number;
  isCapture: boolean;
  isCheck: boolean;
  isMate: boolean;
  annotation?: '!!' | '!' | '!?' | '?' | '??';
}

export type GameOutcomeReason =
  | 'checkmate'
  | 'timeout'
  | 'resignation'
  | 'stalemate'
  | 'repetition'
  | 'insufficient'
  | 'fifty-move'
  | 'agreement';

export interface GameResult {
  winner: PlayerColor | 'draw';
  reason: GameOutcomeReason;
  eloDelta: number;
  newElo: number;
  accuracyWhite: number;
  accuracyBlack: number;
  tournamentAdvanced?: boolean;
  tournamentChampion?: boolean;
  leaguePrizeWon?: number;
}

export interface MatchRecord {
  id: string;
  dateIso: string;
  mode: MatchMode;
  opponentName: string;
  opponentElo: number;
  playerColor: PlayerColor;
  timeControlLabel: string;
  opening: string;
  result: 'win' | 'loss' | 'draw';
  reason: GameOutcomeReason;
  eloDelta: number;
  movesCount: number;
  accuracy: number;
}

export interface WalletTransaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'entry_fee' | 'prize';
  method: string;
  referenceId: string;
  amount: number;
  timestampIso: string;
  note: string;
}

export interface PlayerProfile {
  id: string;
  name: string;
  elo: number;
  peakElo: number;
  wins: number;
  losses: number;
  draws: number;
  streak: number;
  trophies: number;
  walletBalance: number;
  transactions: WalletTransaction[];
  history: MatchRecord[];
}

export interface BracketParticipant {
  id: string;
  name: string;
  title: string;
  elo: number;
  avatarUrl?: string;
  isPlayer: boolean;
  rivalId?: string;
}

export interface BracketMatch {
  id: string;
  round: 1 | 2 | 3;
  slot: number;
  playerA: BracketParticipant | null;
  playerB: BracketParticipant | null;
  winnerId: string | null;
  scoreLabel?: string;
}

export interface TournamentState {
  id: string;
  name: string;
  timeControlId: string;
  status: 'active' | 'eliminated' | 'champion';
  currentRound: 1 | 2 | 3;
  matches: BracketMatch[];
  playerColorNext: PlayerColor;
}

export interface WorldLeaguePlayer {
  id: string;
  name: string;
  country: string;
  elo: number;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  buchholz: number;
  isPlayer: boolean;
  rivalId: string;
  playedIds: string[];
}

export type LeagueDifficulty = 'normal' | 'hard' | 'hardcore' | 'expert';

export interface WorldLeagueState {
  seasonNumber: number;
  difficulty: LeagueDifficulty;
  entryFee: number; // 500 | 1000 | 2000 | 3000
  maxPlayers: number; // 50
  prizePool: number; // 50000
  timeControlId: string;
  status: 'open' | 'active' | 'completed';
  currentRound: number; // 1..5
  totalRounds: number; // 5
  players: WorldLeaguePlayer[];
  currentOpponentId: string | null;
  nextColor: PlayerColor;
  payoutAwarded: boolean;
}

export interface FriendRoomPlayer {
  id: string;
  name: string;
  elo: number;
  connected: boolean;
}

export interface FriendChatMessage {
  id: string;
  sender: string;
  text: string;
  ts: number;
}

export type MoradabadDivision = 'school' | 'college' | 'company';

export interface MoradabadInstitution {
  id: string;
  passCode: string;
  division: MoradabadDivision;
  name: string;
  city: string;
  coordinatorName: string;
  feePaid: number; // 10000 per school / college / company
  paymentMethod: string;
  studentSeats: number;
  registeredAt: string;
}

export interface MoradabadLeaguePlayer {
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

export interface MoradabadRecentMatch {
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

export interface MoradabadDivisionState {
  division: MoradabadDivision;
  title: string;
  city: string;
  managementFeePerInstitution: number; // 10000
  studentEntryFee: number; // 0
  prizePool: number;
  prizes: {
    first: number;
    second: number;
    third: number;
  };
  institutions: MoradabadInstitution[];
  players: MoradabadLeaguePlayer[];
  recentMatches: MoradabadRecentMatch[];
  payoutSettled: boolean;
}

export interface MoradabadLeaguesState {
  school: MoradabadDivisionState;
  college: MoradabadDivisionState;
  company: MoradabadDivisionState;
}

export interface WorldLivePlayer {
  playerId: string;
  name: string;
  elo: number;
  tierId: LeagueDifficulty;
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

export interface WorldLiveMatch {
  id: string;
  whiteName: string;
  blackName: string;
  winner: PlayerColor | 'draw';
  reason: string;
  finishedAt: string;
}

export interface WorldLiveState {
  title: string;
  maxPlayers: number; // 50
  prizePool: number; // 50000
  prizes: {
    first: number; // 25000
    second: number; // 16667
    third: number; // 8333
  };
  players: WorldLivePlayer[];
  recentMatches: WorldLiveMatch[];
  payoutSettled: boolean;
}

export interface FriendRoomState {
  code: string;
  timeControlId: string;
  fen: string;
  pgn: string;
  turn: PlayerColor;
  moves: {
    ply: number;
    moveNumber: number;
    color: PlayerColor;
    san: string;
    from: string;
    to: string;
    fenAfter: string;
  }[];
  white: FriendRoomPlayer | null;
  black: FriendRoomPlayer | null;
  whiteTimeMs: number;
  blackTimeMs: number;
  status: 'waiting' | 'playing' | 'finished';
  winner: PlayerColor | 'draw' | null;
  reason: string | null;
  drawOfferBy: PlayerColor | null;
  rematchVotes: string[];
  chat: FriendChatMessage[];
  leagueMeta?: {
    kind?: 'world' | 'moradabad';
    division?: MoradabadDivision;
    leagueTitle: string;
    whiteInstitution?: string;
    blackInstitution?: string;
  } | null;
}

export interface ArenaChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderElo: number;
  text: string;
  ts: number;
}

export interface CampusSponsorship {
  id: string;
  passCode: string;
  institutionName: string;
  coordinatorName: string;
  division: string;
  tierId: LeagueDifficulty;
  studentSeats: number;
  amountPaidByManagement: number;
  paymentMethod: string;
  timestampIso: string;
  redeemedForLeague: boolean;
}

