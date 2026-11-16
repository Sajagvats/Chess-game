import { BoardTheme, RivalProfile, TimeControl } from '../types/chess';

export const RIVALS: RivalProfile[] = [
  {
    id: 'aarav',
    name: 'Aarav Mehta',
    title: 'Club Challenger',
    elo: 950,
    country: 'IND',
    style: 'Sharp & Impatient',
    tagline: 'Loves early tactical skirmishes but leaves subtle back-rank weaknesses.',
    avatarUrl: '/src/assets/images/rival_aarav_1794806550289.jpg',
    searchDepth: 1,
    quiescenceDepth: 0,
    blunderChance: 0.24,
    aggression: 1.15,
    thinkTimeMs: [380, 650],
  },
  {
    id: 'elena',
    name: 'Elena Rostova',
    title: 'Arena Master',
    elo: 1250,
    country: 'POL',
    style: 'Classical Tactician',
    tagline: 'Controls the center methodically and punishes hanging minor pieces.',
    avatarUrl: '/src/assets/images/rival_elena_1794806550023.jpg',
    searchDepth: 2,
    quiescenceDepth: 1,
    blunderChance: 0.12,
    aggression: 1.05,
    thinkTimeMs: [450, 780],
  },
  {
    id: 'viktor',
    name: 'Viktor Krol',
    title: 'FIDE Master',
    elo: 1550,
    country: 'CZE',
    style: 'Positional Grinder',
    tagline: 'Builds rock-solid pawn chains and converts endgame bishop pairs.',
    avatarUrl: '/src/assets/images/rival_viktor_1794806551104.jpg',
    searchDepth: 2,
    quiescenceDepth: 2,
    blunderChance: 0.05,
    aggression: 0.95,
    thinkTimeMs: [520, 920],
  },
  {
    id: 'meera',
    name: 'Meera Krishnan',
    title: 'International Master',
    elo: 1850,
    country: 'IND',
    style: 'Dynamic Counter-Attacker',
    tagline: 'Calculates deep forcing variations and thrives in sharp blitz scrambles.',
    avatarUrl: '/src/assets/images/rival_meera_1794806549731.jpg',
    searchDepth: 3,
    quiescenceDepth: 2,
    blunderChance: 0.015,
    aggression: 1.12,
    thinkTimeMs: [580, 1050],
  },
  {
    id: 'magnus',
    name: 'Magnus Falk',
    title: 'Grandmaster',
    elo: 2200,
    country: 'NOR',
    style: 'Relentless Endgame Machine',
    tagline: 'Zero mercy in time trouble; squeezes microscopic advantages to checkmate.',
    avatarUrl: '/src/assets/images/rival_magnus_1794806551312.jpg',
    searchDepth: 3,
    quiescenceDepth: 3,
    blunderChance: 0,
    aggression: 1.08,
    thinkTimeMs: [650, 1180],
  },
];

export interface ComputerDifficultyOption {
  id: 'easy' | 'moderate' | 'hard' | 'hardcore' | 'expert';
  label: string;
  rivalId: string;
  eloLabel: string;
  summary: string;
}

export const COMPUTER_LEVELS: ComputerDifficultyOption[] = [
  {
    id: 'easy',
    label: 'Easy',
    rivalId: 'aarav',
    eloLabel: '950 Elo',
    summary: 'Beginner & Student friendly',
  },
  {
    id: 'moderate',
    label: 'Moderate',
    rivalId: 'elena',
    eloLabel: '1250 Elo',
    summary: 'Balanced classical club play',
  },
  {
    id: 'hard',
    label: 'Hard',
    rivalId: 'viktor',
    eloLabel: '1550 Elo',
    summary: 'Sharp positional club test',
  },
  {
    id: 'hardcore',
    label: 'Hardcore',
    rivalId: 'meera',
    eloLabel: '1850 Elo',
    summary: 'Aggressive deep calculation',
  },
  {
    id: 'expert',
    label: 'Expert',
    rivalId: 'magnus',
    eloLabel: '2200 Elo',
    summary: 'Grandmaster · Zero blunders',
  },
];

export const TIME_CONTROLS: TimeControl[] = [
  { id: '1+0', label: '1+0', category: 'Bullet', initialSeconds: 60, incrementSeconds: 0 },
  { id: '2+1', label: '2+1', category: 'Bullet', initialSeconds: 120, incrementSeconds: 1 },
  { id: '3+0', label: '3+0', category: 'Blitz', initialSeconds: 180, incrementSeconds: 0 },
  { id: '3+2', label: '3+2', category: 'Blitz', initialSeconds: 180, incrementSeconds: 2 },
  { id: '5+0', label: '5+0', category: 'Blitz', initialSeconds: 300, incrementSeconds: 0 },
  { id: '10+0', label: '10+0', category: 'Rapid', initialSeconds: 600, incrementSeconds: 0 },
  { id: '15+10', label: '15+10', category: 'Rapid', initialSeconds: 900, incrementSeconds: 10 },
];

export const BOARD_THEMES: BoardTheme[] = [
  {
    id: 'walnut',
    name: 'Tournament Walnut',
    lightSquare: '#EADBC8',
    darkSquare: '#9B6B43',
    lastMoveLight: '#F3D27A',
    lastMoveDark: '#C89B3C',
    coordLight: '#845834',
    coordDark: '#F2E5D5',
    frameBorder: '#5C3D24',
  },
  {
    id: 'emerald',
    name: 'Championship Emerald',
    lightSquare: '#EEEED2',
    darkSquare: '#4E7855',
    lastMoveLight: '#F6F669',
    lastMoveDark: '#BACA2B',
    coordLight: '#43694A',
    coordDark: '#EEEED2',
    frameBorder: '#2D4A33',
  },
  {
    id: 'slate',
    name: 'Obsidian Slate',
    lightSquare: '#CBD5E1',
    darkSquare: '#475569',
    lastMoveLight: '#FDE68A',
    lastMoveDark: '#B4882D',
    coordLight: '#334155',
    coordDark: '#E2E8F0',
    frameBorder: '#1E293B',
  },
];

export const OPENING_BOOK_NAMES: Record<string, string> = {
  'e4': "King's Pawn Opening",
  'e4 e5': "Open Game",
  'e4 e5 Nf3 Nc6 Bb5': 'Ruy Lopez (Spanish Game)',
  'e4 e5 Nf3 Nc6 Bc4': 'Italian Game',
  'e4 e5 Nf3 Nc6 Bc4 Bc5': 'Giuoco Piano',
  'e4 e5 Nf3 Nc6 Bc4 Nf6': 'Two Knights Defense',
  'e4 e5 Nf3 Nc6 d4': 'Scotch Game',
  'e4 e5 Nf3 Nf6': "Petrov's Defense",
  'e4 e5 f4': "King's Gambit",
  'e4 c5': 'Sicilian Defense',
  'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6': 'Sicilian Defense: Najdorf',
  'e4 c5 Nf3 Nc6': 'Sicilian Defense: Open',
  'e4 c5 c3': 'Sicilian Defense: Alapin',
  'e4 e6': 'French Defense',
  'e4 e6 d4 d5': 'French Defense: Main Line',
  'e4 c6': 'Caro-Kann Defense',
  'e4 d5': 'Scandinavian Defense',
  'e4 d6': 'Pirc Defense',
  'e4 Nf6': "Alekhine's Defense",
  'd4': "Queen's Pawn Opening",
  'd4 d5': 'Closed Game',
  'd4 d5 c4': "Queen's Gambit",
  'd4 d5 c4 e6': "Queen's Gambit Declined",
  'd4 d5 c4 c6': 'Slav Defense',
  'd4 d5 c4 dxc4': "Queen's Gambit Accepted",
  'd4 d5 Bf4': 'London System',
  'd4 Nf6 c4 g6': "King's Indian Defense",
  'd4 Nf6 c4 e6 Nc3 Bb4': 'Nimzo-Indian Defense',
  'd4 Nf6 c4 e6 Nf3 b6': "Queen's Indian Defense",
  'd4 f5': 'Dutch Defense',
  'c4': 'English Opening',
  'Nf3': 'Réti Opening',
  'g3': "King's Fianchetto Opening",
  'b3': "Nimzo-Larsen Attack",
};

export function detectOpeningName(sans: string[]): string {
  if (sans.length === 0) return 'Starting Position';
  for (let len = Math.min(sans.length, 10); len >= 1; len--) {
    const key = sans.slice(0, len).join(' ');
    if (OPENING_BOOK_NAMES[key]) {
      return OPENING_BOOK_NAMES[key];
    }
  }
  return sans[0] === 'e4'
    ? "King's Pawn Game"
    : sans[0] === 'd4'
    ? "Queen's Pawn Game"
    : 'Unorthodox Opening';
}
