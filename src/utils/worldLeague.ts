import { RIVALS } from '../data/rivals';
import {
  LeagueDifficulty,
  PlayerColor,
  WorldLeaguePlayer,
  WorldLeagueState,
} from '../types/chess';

export interface LeagueTierConfig {
  id: LeagueDifficulty;
  label: string;
  entryFee: number;
  eloRange: [number, number];
  defaultRivalId: string;
  description: string;
}

export const LEAGUE_PRIZE_POOL = 50000;

// 3 : 2 : 1 ratio of 50,000 (total 6 parts: 3/6 = 25000, 2/6 = 16667, 1/6 = 8333)
export const LEAGUE_PRIZES = {
  first: 25000,
  second: 16667,
  third: 8333,
} as const;

export const LEAGUE_TIERS: LeagueTierConfig[] = [
  {
    id: 'normal',
    label: 'Normal',
    entryFee: 500,
    eloRange: [900, 1280],
    defaultRivalId: 'aarav',
    description: 'Balanced club competition (900–1280 Elo)',
  },
  {
    id: 'hard',
    label: 'Hard',
    entryFee: 1000,
    eloRange: [1200, 1580],
    defaultRivalId: 'elena',
    description: 'Tactical masters & club veterans (1200–1580 Elo)',
  },
  {
    id: 'hardcore',
    label: 'Hardcore',
    entryFee: 2000,
    eloRange: [1520, 1900],
    defaultRivalId: 'viktor',
    description: 'High-stakes positional masters (1520–1900 Elo)',
  },
  {
    id: 'expert',
    label: 'Expert',
    entryFee: 3000,
    eloRange: [1850, 2240],
    defaultRivalId: 'magnus',
    description: 'Grandmaster & IM gauntlet (1850–2240 Elo)',
  },
];

const WORLD_ROSTER_NAMES: { name: string; country: string }[] = [
  { name: 'Arjun Deshmukh', country: 'IND' },
  { name: 'Liam O’Connor', country: 'IRL' },
  { name: 'Yuki Tanaka', country: 'JPN' },
  { name: 'Mateo Alvarez', country: 'ESP' },
  { name: 'Noah Lindqvist', country: 'SWE' },
  { name: 'Kavya Nair', country: 'IND' },
  { name: 'Soren Berg', country: 'DEN' },
  { name: 'Clara Moreau', country: 'FRA' },
  { name: 'Tariq Al-Mansoor', country: 'UAE' },
  { name: 'David Kim', country: 'KOR' },
  { name: 'Ananya Verma', country: 'IND' },
  { name: 'Lucas Vance', country: 'USA' },
  { name: 'Sofia Chen', country: 'SGP' },
  { name: 'Henrik Solberg', country: 'NOR' },
  { name: 'Isabella Rossi', country: 'ITA' },
  { name: 'Omar Farooq', country: 'EGY' },
  { name: 'Mikhail Volkov', country: 'KAZ' },
  { name: 'Chloe Bennett', country: 'GBR' },
  { name: 'Rohan Kulkarni', country: 'IND' },
  { name: 'Zara Petrova', country: 'BUL' },
  { name: 'Gabriel Santos', country: 'BRA' },
  { name: 'Nadia Haddad', country: 'MAR' },
  { name: 'Felix Weber', country: 'GER' },
  { name: 'Amina Diallo', country: 'SEN' },
  { name: 'Daniel Novak', country: 'SVK' },
  { name: 'Priya Subramanian', country: 'IND' },
  { name: 'Ethan Brooks', country: 'CAN' },
  { name: 'Lea Horvat', country: 'CRO' },
  { name: 'Ivan Sokolov', country: 'SRB' },
  { name: 'Maya Lin', country: 'TWN' },
  { name: 'Karan Gill', country: 'IND' },
  { name: 'Eva Lindholm', country: 'FIN' },
  { name: 'Julian Costa', country: 'ARG' },
  { name: 'Tessa Van Dijk', country: 'NED' },
  { name: 'Nikolai Smirnov', country: 'ARM' },
  { name: 'Siddharth Iyer', country: 'IND' },
  { name: 'Hana Koval', country: 'UKR' },
  { name: 'Rafael Mendes', country: 'POR' },
  { name: 'Amir Rahimi', country: 'IRI' },
  { name: 'Freya Larsen', country: 'DEN' },
  { name: 'Devansh Joshi', country: 'IND' },
  { name: 'Bastian Meyer', country: 'SUI' },
  { name: 'Samira Karimi', country: 'IRI' },
  { name: 'Luka Bagrationi', country: 'GEO' },
];

function mapEloToRivalId(elo: number): string {
  if (elo < 1100) return RIVALS[0].id;
  if (elo < 1400) return RIVALS[1].id;
  if (elo < 1700) return RIVALS[2].id;
  if (elo < 2000) return RIVALS[3].id;
  return RIVALS[4].id;
}

export function createWorldLeagueSeason(
  seasonNumber: number,
  playerName: string,
  playerElo: number,
  difficulty: LeagueDifficulty = 'normal'
): WorldLeagueState {
  const tier = LEAGUE_TIERS.find((t) => t.id === difficulty) ?? LEAGUE_TIERS[0];
  const [minElo, maxElo] = tier.eloRange;
  const players: WorldLeaguePlayer[] = [];

  // 1. Add Human Player
  players.push({
    id: 'player',
    name: playerName,
    country: 'IND',
    elo: playerElo,
    points: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    buchholz: 0,
    isPlayer: true,
    rivalId: tier.defaultRivalId,
    playedIds: [],
  });

  // 2. Add 5 Featured Masters (clamped/calibrated around tier)
  RIVALS.forEach((r, idx) => {
    const t = idx / Math.max(1, RIVALS.length - 1);
    const scaledElo = Math.round(minElo + t * (maxElo - minElo));
    players.push({
      id: `wl-${r.id}`,
      name: r.name,
      country: r.country,
      elo: scaledElo,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholz: 0,
      isPlayer: false,
      rivalId: mapEloToRivalId(scaledElo),
      playedIds: [],
    });
  });

  // 3. Add 44 Global Contenders -> Exact 50 Players!
  WORLD_ROSTER_NAMES.forEach((entry, idx) => {
    const t = idx / Math.max(1, WORLD_ROSTER_NAMES.length - 1);
    const elo = Math.round(minElo + t * (maxElo - minElo));
    players.push({
      id: `wl-contender-${idx + 1}`,
      name: entry.name,
      country: entry.country,
      elo,
      points: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      buchholz: 0,
      isPlayer: false,
      rivalId: mapEloToRivalId(elo),
      playedIds: [],
    });
  });

  const firstOpponent = pickSwissOpponent('player', players);

  return {
    seasonNumber,
    difficulty: tier.id,
    entryFee: tier.entryFee,
    maxPlayers: 50,
    prizePool: LEAGUE_PRIZE_POOL,
    timeControlId: '3+2',
    status: 'active',
    currentRound: 1,
    totalRounds: 5,
    players,
    currentOpponentId: firstOpponent?.id ?? players[1].id,
    nextColor: 'w',
    payoutAwarded: false,
  };
}

export function pickSwissOpponent(
  playerId: string,
  players: WorldLeaguePlayer[]
): WorldLeaguePlayer | null {
  const me = players.find((p) => p.id === playerId);
  if (!me) return null;

  const candidates = players
    .filter((p) => p.id !== playerId && !me.playedIds.includes(p.id))
    .sort((a, b) => {
      const pointDiff = Math.abs(a.points - me.points) - Math.abs(b.points - me.points);
      if (pointDiff !== 0) return pointDiff;
      return Math.abs(a.elo - me.elo) - Math.abs(b.elo - me.elo);
    });

  return candidates[0] ?? players.find((p) => p.id !== playerId) ?? null;
}

export function resolveWorldLeagueRound(
  league: WorldLeagueState,
  playerOutcome: 'win' | 'draw' | 'loss'
): WorldLeagueState {
  const players = league.players.map((p) => ({
    ...p,
    playedIds: [...p.playedIds],
  }));

  const me = players.find((p) => p.isPlayer)!;
  const opp = players.find((p) => p.id === league.currentOpponentId) ?? players[1];

  me.playedIds.push(opp.id);
  opp.playedIds.push(me.id);

  if (playerOutcome === 'win') {
    me.points += 3;
    me.wins += 1;
    opp.losses += 1;
  } else if (playerOutcome === 'draw') {
    me.points += 1;
    me.draws += 1;
    opp.points += 1;
    opp.draws += 1;
  } else {
    me.losses += 1;
    opp.points += 3;
    opp.wins += 1;
  }

  const remaining = players
    .filter((p) => p.id !== me.id && p.id !== opp.id)
    .sort((a, b) => b.points - a.points || b.elo - a.elo);

  const paired = new Set<string>();
  for (let i = 0; i < remaining.length; i++) {
    const a = remaining[i];
    if (paired.has(a.id)) continue;

    let partnerIdx = remaining.findIndex(
      (b, j) => j > i && !paired.has(b.id) && !a.playedIds.includes(b.id)
    );
    if (partnerIdx === -1) {
      partnerIdx = remaining.findIndex((b, j) => j > i && !paired.has(b.id));
    }
    if (partnerIdx === -1) continue;

    const b = remaining[partnerIdx];
    paired.add(a.id);
    paired.add(b.id);
    a.playedIds.push(b.id);
    b.playedIds.push(a.id);

    const expA = 1 / (1 + Math.pow(10, (b.elo - a.elo) / 400));
    const roll = Math.random();
    const drawThreshold = 0.18;

    if (roll < expA * (1 - drawThreshold)) {
      a.points += 3;
      a.wins += 1;
      b.losses += 1;
    } else if (roll < expA * (1 - drawThreshold) + drawThreshold) {
      a.points += 1;
      a.draws += 1;
      b.points += 1;
      b.draws += 1;
    } else {
      b.points += 3;
      b.wins += 1;
      a.losses += 1;
    }
  }

  const pointsMap = new Map(players.map((p) => [p.id, p.points]));
  for (const p of players) {
    p.buchholz = p.playedIds.reduce((sum, id) => sum + (pointsMap.get(id) ?? 0), 0);
  }

  const isCompleted = league.currentRound >= league.totalRounds;
  const nextRound = isCompleted ? league.currentRound : league.currentRound + 1;
  const nextOpponent = isCompleted ? null : pickSwissOpponent('player', players);
  const nextColor: PlayerColor = league.nextColor === 'w' ? 'b' : 'w';

  return {
    ...league,
    status: isCompleted ? 'completed' : 'active',
    currentRound: nextRound,
    players,
    currentOpponentId: nextOpponent?.id ?? null,
    nextColor,
  };
}
