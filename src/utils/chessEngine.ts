import { Chess, Move, PieceSymbol } from 'chess.js';
import { PlayerColor, RivalProfile } from '../types/chess';

export const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Piece-square tables from White's perspective (rank 8 at index 0 -> rank 1 at index 7)
const PAWN_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5, 5, 10, 27, 27, 10, 5, 5],
  [0, 0, 0, 24, 24, 0, 0, 0],
  [5, -5, -10, 0, 0, -10, -5, 5],
  [5, 10, 10, -22, -22, 10, 10, 5],
  [0, 0, 0, 0, 0, 0, 0, 0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20, 0, 0, 0, 0, -20, -40],
  [-30, 0, 10, 15, 15, 10, 0, -30],
  [-30, 5, 15, 20, 20, 15, 5, -30],
  [-30, 0, 15, 20, 20, 15, 0, -30],
  [-30, 5, 10, 15, 15, 10, 5, -30],
  [-40, -20, 0, 5, 5, 0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 8, 12, 12, 8, 0, -10],
  [-10, 6, 6, 12, 12, 6, 6, -10],
  [-10, 0, 12, 12, 12, 12, 0, -10],
  [-10, 10, 10, 10, 10, 10, 10, -10],
  [-10, 6, 0, 0, 0, 0, 6, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0, 0, 0, 0, 0, 0, 0, 0],
  [6, 12, 12, 12, 12, 12, 12, 6],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [-5, 0, 0, 0, 0, 0, 0, -5],
  [0, 0, 0, 6, 6, 0, 0, 0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10, 0, 0, 0, 0, 0, 0, -10],
  [-10, 0, 5, 5, 5, 5, 0, -10],
  [-5, 0, 5, 5, 5, 5, 0, -5],
  [0, 0, 5, 5, 5, 5, 0, -5],
  [-10, 5, 5, 5, 5, 5, 0, -10],
  [-10, 0, 5, 0, 0, 0, 0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MID_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20, 20, 0, 0, 0, 0, 20, 20],
  [20, 30, 10, 0, 0, 10, 30, 20],
];

const KING_END_PST = [
  [-50, -40, -30, -20, -20, -30, -40, -50],
  [-30, -20, -10, 0, 0, -10, -20, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 30, 40, 40, 30, -10, -30],
  [-30, -10, 20, 30, 30, 20, -10, -30],
  [-30, -30, 0, 0, 0, 0, -30, -30],
  [-50, -30, -30, -30, -30, -30, -30, -50],
];

function getPstValue(type: PieceSymbol, color: PlayerColor, row: number, col: number, isEndgame: boolean): number {
  const r = color === 'w' ? row : 7 - row;
  switch (type) {
    case 'p':
      return PAWN_PST[r][col];
    case 'n':
      return KNIGHT_PST[r][col];
    case 'b':
      return BISHOP_PST[r][col];
    case 'r':
      return ROOK_PST[r][col];
    case 'q':
      return QUEEN_PST[r][col];
    case 'k':
      return isEndgame ? KING_END_PST[r][col] : KING_MID_PST[r][col];
  }
}

/**
 * Evaluate board from White's perspective in centipawns.
 */
export function evaluatePositionCp(chess: Chess): number {
  if (chess.isCheckmate()) {
    return chess.turn() === 'w' ? -99999 : 99999;
  }
  if (chess.isDraw() || chess.isStalemate() || chess.isThreefoldRepetition() || chess.isInsufficientMaterial()) {
    return 0;
  }

  const board = chess.board();
  let totalNonKingMaterial = 0;
  let whiteBishops = 0;
  let blackBishops = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq || sq.type === 'k') continue;
      totalNonKingMaterial += PIECE_VALUES[sq.type];
      if (sq.type === 'b') {
        if (sq.color === 'w') whiteBishops++;
        else blackBishops++;
      }
    }
  }

  const isEndgame = totalNonKingMaterial <= 2600;
  let score = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq) continue;
      const val = PIECE_VALUES[sq.type] + getPstValue(sq.type, sq.color, r, c, isEndgame);
      score += sq.color === 'w' ? val : -val;
    }
  }

  // Bishop pair bonus
  if (whiteBishops >= 2) score += 35;
  if (blackBishops >= 2) score -= 35;

  // Check bonus
  if (chess.inCheck()) {
    score += chess.turn() === 'w' ? -25 : 25;
  }

  return score;
}

function scoreMoveForOrdering(move: Move): number {
  let score = 0;
  if (move.captured) {
    score += 10 * PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
  }
  if (move.promotion) {
    score += PIECE_VALUES[move.promotion];
  }
  if (move.san.includes('+')) {
    score += 45;
  }
  if (move.flags.includes('k') || move.flags.includes('q')) {
    score += 40;
  }
  return score;
}

function orderMoves(moves: Move[]): Move[] {
  return moves.sort((a, b) => scoreMoveForOrdering(b) - scoreMoveForOrdering(a));
}

function quiescence(chess: Chess, alpha: number, beta: number, qDepth: number): number {
  const turnSign = chess.turn() === 'w' ? 1 : -1;
  const standPat = turnSign * evaluatePositionCp(chess);

  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;
  if (qDepth <= 0) return alpha;

  const captures = orderMoves(
    chess.moves({ verbose: true }).filter((m) => Boolean(m.captured) || Boolean(m.promotion))
  );

  for (const move of captures) {
    chess.move(move);
    const score = -quiescence(chess, -beta, -alpha, qDepth - 1);
    chess.undo();

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function negamax(
  chess: Chess,
  depth: number,
  alpha: number,
  beta: number,
  qDepth: number,
  deadlineMs: number
): number {
  if (chess.isCheckmate()) {
    // Prefer faster checkmates
    return -90000 - depth * 100;
  }
  if (chess.isDraw()) {
    return 0;
  }
  if (depth <= 0 || Date.now() > deadlineMs) {
    return qDepth > 0
      ? quiescence(chess, alpha, beta, qDepth)
      : (chess.turn() === 'w' ? 1 : -1) * evaluatePositionCp(chess);
  }

  const moves = orderMoves(chess.moves({ verbose: true }));
  let best = -Infinity;

  for (const move of moves) {
    chess.move(move);
    const score = -negamax(chess, depth - 1, -beta, -alpha, qDepth, deadlineMs);
    chess.undo();

    if (score > best) best = score;
    if (score > alpha) alpha = score;
    if (alpha >= beta) break;
  }

  return best;
}

// Curated competitive opening responses by FEN or move prefix
const OPENING_REPERTOIRE: Record<string, string[]> = {
  '': ['e4', 'd4', 'c4', 'Nf3'],
  'e4': ['c5', 'e5', 'e6', 'c6'],
  'd4': ['Nf6', 'd5'],
  'c4': ['e5', 'Nf6', 'c5'],
  'e4 e5': ['Nf3', 'Bc4'],
  'e4 c5': ['Nf3', 'Nc3'],
  'e4 e6': ['d4'],
  'e4 c6': ['d4'],
  'e4 e5 Nf3': ['Nc6', 'Nf6'],
  'e4 e5 Nf3 Nc6': ['Bb5', 'Bc4', 'd4'],
  'e4 c5 Nf3': ['d6', 'Nc6', 'e6'],
  'd4 d5': ['c4', 'Bf4'],
  'd4 Nf6': ['c4', 'Nf3'],
  'd4 Nf6 c4': ['e6', 'g6'],
};

export function selectBotMove(fen: string, historySans: string[], rival: RivalProfile): Move | null {
  const chess = new Chess(fen);
  const legalMoves = chess.moves({ verbose: true });
  if (legalMoves.length === 0) return null;

  // Check opening repertoire for first 4 plies (unless blunderChance triggers on weak bots)
  if (historySans.length <= 4 && rival.elo >= 1200) {
    const key = historySans.join(' ');
    const bookChoices = OPENING_REPERTOIRE[key];
    if (bookChoices && bookChoices.length > 0) {
      const candidateSans = bookChoices.filter((san) =>
        legalMoves.some((m) => m.san === san)
      );
      if (candidateSans.length > 0) {
        const chosenSan = candidateSans[Math.floor(Math.random() * candidateSans.length)];
        const matched = legalMoves.find((m) => m.san === chosenSan);
        if (matched) return matched;
      }
    }
  }

  // Controlled imperfection for lower-rated rivals
  if (rival.blunderChance > 0 && Math.random() < rival.blunderChance) {
    const pool = legalMoves.slice(0, Math.min(6, legalMoves.length));
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const ordered = orderMoves([...legalMoves]);
  const deadlineMs = Date.now() + (rival.elo >= 2000 ? 1150 : 750);
  const scoredMoves: { move: Move; score: number }[] = [];

  let alpha = -Infinity;
  const beta = Infinity;

  for (const move of ordered) {
    chess.move(move);
    let score = -negamax(
      chess,
      Math.max(0, rival.searchDepth - 1),
      -beta,
      -alpha,
      rival.quiescenceDepth,
      deadlineMs
    );
    chess.undo();

    // Small aggression nudge for captures/checks
    if (rival.aggression > 1 && (move.captured || move.san.includes('+'))) {
      score += (rival.aggression - 1) * 35;
    }

    scoredMoves.push({ move, score });
    if (score > alpha) alpha = score;
  }

  scoredMoves.sort((a, b) => b.score - a.score);

  // Pick among top near-equal moves for natural variety
  const bestScore = scoredMoves[0].score;
  const tolerance = rival.elo >= 1850 ? 10 : rival.elo >= 1500 ? 22 : 45;
  const topCandidates = scoredMoves.filter((item) => bestScore - item.score <= tolerance);
  const pick = topCandidates[Math.floor(Math.random() * topCandidates.length)];
  return pick.move;
}

export function calculateEloDelta(
  playerElo: number,
  opponentElo: number,
  score: 1 | 0.5 | 0
): number {
  const kFactor = 32;
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(kFactor * (score - expected));
}

export function shouldBotAcceptDraw(
  fen: string,
  botColor: PlayerColor,
  moveCount: number
): boolean {
  if (moveCount < 16) return false;
  const chess = new Chess(fen);
  const cpWhite = evaluatePositionCp(chess);
  const cpBot = botColor === 'w' ? cpWhite : -cpWhite;
  // Accept draw if bot is slightly worse or completely dead equal after move 16
  return cpBot <= 35;
}

export function getCapturedAndAdvantage(chess: Chess): {
  capturedByWhite: PieceSymbol[];
  capturedByBlack: PieceSymbol[];
  advantageWhite: number;
} {
  const startCounts: Record<Exclude<PieceSymbol, 'k'>, number> = {
    q: 1,
    r: 2,
    b: 2,
    n: 2,
    p: 8,
  };
  const currentWhite: Record<Exclude<PieceSymbol, 'k'>, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };
  const currentBlack: Record<Exclude<PieceSymbol, 'k'>, number> = { q: 0, r: 0, b: 0, n: 0, p: 0 };

  const board = chess.board();
  let whiteMat = 0;
  let blackMat = 0;

  const matVals: Record<Exclude<PieceSymbol, 'k'>, number> = { q: 9, r: 5, b: 3, n: 3, p: 1 };

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (!sq || sq.type === 'k') continue;
      if (sq.color === 'w') {
        currentWhite[sq.type]++;
        whiteMat += matVals[sq.type];
      } else {
        currentBlack[sq.type]++;
        blackMat += matVals[sq.type];
      }
    }
  }

  const order: Exclude<PieceSymbol, 'k'>[] = ['q', 'r', 'b', 'n', 'p'];
  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  for (const p of order) {
    const blackLost = Math.max(0, startCounts[p] - currentBlack[p]);
    for (let i = 0; i < blackLost; i++) capturedByWhite.push(p);
    const whiteLost = Math.max(0, startCounts[p] - currentWhite[p]);
    for (let i = 0; i < whiteLost; i++) capturedByBlack.push(p);
  }

  return {
    capturedByWhite,
    capturedByBlack,
    advantageWhite: whiteMat - blackMat,
  };
}
