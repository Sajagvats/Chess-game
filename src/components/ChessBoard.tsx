import React, { useMemo, useState } from 'react';
import { Chess, Move, PieceSymbol, Square } from 'chess.js';
import { BoardTheme, PlayerColor } from '../types/chess';
import { PieceSvg } from './ChessPieces';

interface ChessBoardProps {
  fen: string;
  orientation: PlayerColor;
  theme: BoardTheme;
  canInteract: boolean;
  playerTurnColor: PlayerColor | 'both';
  lastMove: { from: string; to: string } | null;
  isReviewing: boolean;
  onAttemptMove: (from: string, to: string, promotion?: PieceSymbol) => boolean;
}

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['8', '7', '6', '5', '4', '3', '2', '1'];

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation,
  theme,
  canInteract,
  playerTurnColor,
  lastMove,
  isReviewing,
  onAttemptMove,
}) => {
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [dragFromSquare, setDragFromSquare] = useState<Square | null>(null);
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: Square;
    to: Square;
    color: PlayerColor;
  } | null>(null);

  const chess = useMemo(() => new Chess(fen), [fen]);
  const board = useMemo(() => chess.board(), [chess]);
  const activeTurn = chess.turn();
  const inCheck = chess.inCheck();

  const isPlayerAllowedToMove =
    canInteract &&
    !isReviewing &&
    (playerTurnColor === 'both' || playerTurnColor === activeTurn);

  const legalMovesForSelected = useMemo(() => {
    if (!selectedSquare || !isPlayerAllowedToMove) return new Map<Square, Move>();
    const moves = chess.moves({ square: selectedSquare, verbose: true });
    const map = new Map<Square, Move>();
    for (const m of moves) {
      map.set(m.to, m);
    }
    return map;
  }, [chess, selectedSquare, isPlayerAllowedToMove]);

  const orderedRows = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];
  const orderedCols = orientation === 'w' ? [0, 1, 2, 3, 4, 5, 6, 7] : [7, 6, 5, 4, 3, 2, 1, 0];

  const tryMove = (from: Square, to: Square) => {
    const piece = chess.get(from);
    if (!piece) return;

    const moves = chess.moves({ square: from, verbose: true });
    const matching = moves.filter((m) => m.to === to);
    if (matching.length === 0) return;

    const needsPromotion = matching.some((m) => Boolean(m.promotion));
    if (needsPromotion) {
      setPendingPromotion({ from, to, color: piece.color });
      setSelectedSquare(null);
      return;
    }

    const ok = onAttemptMove(from, to);
    if (ok) {
      setSelectedSquare(null);
    }
  };

  const handleSquareClick = (sq: Square) => {
    if (!isPlayerAllowedToMove || pendingPromotion) return;

    const pieceAtSq = chess.get(sq);

    if (selectedSquare) {
      if (selectedSquare === sq) {
        setSelectedSquare(null);
        return;
      }
      if (legalMovesForSelected.has(sq)) {
        tryMove(selectedSquare, sq);
        return;
      }
      if (pieceAtSq && pieceAtSq.color === activeTurn) {
        setSelectedSquare(sq);
        return;
      }
      setSelectedSquare(null);
      return;
    }

    if (pieceAtSq && pieceAtSq.color === activeTurn) {
      setSelectedSquare(sq);
    }
  };

  const handleDragStart = (e: React.DragEvent, sq: Square) => {
    if (!isPlayerAllowedToMove || pendingPromotion) {
      e.preventDefault();
      return;
    }
    const pieceAtSq = chess.get(sq);
    if (!pieceAtSq || pieceAtSq.color !== activeTurn) {
      e.preventDefault();
      return;
    }
    setDragFromSquare(sq);
    setSelectedSquare(sq);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', sq);
  };

  const handleDrop = (e: React.DragEvent, targetSq: Square) => {
    e.preventDefault();
    const fromSq = (dragFromSquare || e.dataTransfer.getData('text/plain')) as Square;
    setDragFromSquare(null);
    if (!fromSq || fromSq === targetSq || !isPlayerAllowedToMove) return;

    const moves = chess.moves({ square: fromSq, verbose: true });
    if (moves.some((m) => m.to === targetSq)) {
      tryMove(fromSq, targetSq);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (isPlayerAllowedToMove) {
      e.preventDefault();
    }
  };

  const handleConfirmPromotion = (promotionPiece: PieceSymbol) => {
    if (!pendingPromotion) return;
    onAttemptMove(pendingPromotion.from, pendingPromotion.to, promotionPiece);
    setPendingPromotion(null);
    setSelectedSquare(null);
  };

  return (
    <div className="relative w-full max-w-[580px] aspect-square select-none touch-manipulation">
      {/* Board outer frame */}
      <div
        className="w-full h-full grid grid-cols-8 grid-rows-8 rounded-lg overflow-hidden shadow-2xl"
        style={{
          border: `3px solid ${theme.frameBorder}`,
        }}
        role="grid"
        aria-label="Chessboard"
      >
        {orderedRows.map((rowIdx, visualRow) =>
          orderedCols.map((colIdx, visualCol) => {
            const sq = `${FILES[colIdx]}${RANKS[rowIdx]}` as Square;
            const piece = board[rowIdx][colIdx];
            const isLightSquare = (rowIdx + colIdx) % 2 === 0;
            const isSelected = selectedSquare === sq;
            const isLastMoveSq = lastMove?.from === sq || lastMove?.to === sq;
            const legalTarget = legalMovesForSelected.get(sq);
            const isKingInCheck =
              inCheck && piece?.type === 'k' && piece.color === activeTurn;

            let bgColor = isLightSquare ? theme.lightSquare : theme.darkSquare;
            if (isLastMoveSq) {
              bgColor = isLightSquare ? theme.lastMoveLight : theme.lastMoveDark;
            }
            if (isSelected) {
              bgColor = '#EAB308';
            }

            const coordColor = isLightSquare ? theme.coordLight : theme.coordDark;
            const showRankCoord = visualCol === 0;
            const showFileCoord = visualRow === 7;

            return (
              <div
                key={sq}
                role="gridcell"
                aria-label={`Square ${sq}${piece ? ` ${piece.color === 'w' ? 'White' : 'Black'} ${piece.type}` : ''}`}
                onClick={() => handleSquareClick(sq)}
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, sq)}
                className="relative flex items-center justify-center w-full h-full transition-colors duration-100"
                style={{
                  backgroundColor: bgColor,
                  boxShadow: isKingInCheck
                    ? 'inset 0 0 18px 4px rgba(220, 38, 38, 0.88)'
                    : undefined,
                }}
              >
                {/* Rank coordinate (left column) */}
                {showRankCoord && (
                  <span
                    className="absolute top-0.5 left-1 text-[10px] font-mono font-bold leading-none pointer-events-none"
                    style={{ color: coordColor }}
                  >
                    {RANKS[rowIdx]}
                  </span>
                )}

                {/* File coordinate (bottom row) */}
                {showFileCoord && (
                  <span
                    className="absolute bottom-0.5 right-1 text-[10px] font-mono font-bold leading-none pointer-events-none"
                    style={{ color: coordColor }}
                  >
                    {FILES[colIdx]}
                  </span>
                )}

                {/* Legal move indicator (empty square dot vs capture ring) */}
                {legalTarget && !piece && (
                  <span
                    className="w-3.5 h-3.5 rounded-full pointer-events-none"
                    style={{ backgroundColor: 'rgba(15, 23, 42, 0.28)' }}
                  />
                )}
                {legalTarget && piece && (
                  <span
                    className="absolute inset-1 rounded-full border-[3.5px] pointer-events-none"
                    style={{ borderColor: 'rgba(15, 23, 42, 0.36)' }}
                  />
                )}

                {/* Chess piece */}
                {piece && (
                  <div
                    draggable={isPlayerAllowedToMove && piece.color === activeTurn}
                    onDragStart={(e) => handleDragStart(e, sq)}
                    className={`w-[86%] h-[86%] flex items-center justify-center transition-transform duration-150 ${
                      isPlayerAllowedToMove && piece.color === activeTurn
                        ? 'cursor-grab active:cursor-grabbing hover:scale-[1.04]'
                        : 'cursor-pointer'
                    }`}
                  >
                    <PieceSvg type={piece.type} color={piece.color} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Promotion Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px] flex items-center justify-center rounded-lg z-20">
          <div className="bg-[#241005] border border-amber-400/30 rounded-xl p-5 shadow-2xl max-w-xs w-full mx-4">
            <h3 className="text-sm font-semibold text-amber-50 text-center mb-3">
              Promote Pawn
            </h3>
            <div className="grid grid-cols-4 gap-2">
              {(['q', 'r', 'b', 'n'] as PieceSymbol[]).map((promo) => (
                <button
                  key={promo}
                  type="button"
                  onClick={() => handleConfirmPromotion(promo)}
                  className="flex flex-col items-center justify-center p-2.5 rounded-lg bg-[#341809] hover:bg-amber-500/20 border border-amber-400/20 hover:border-amber-400/60 transition-colors"
                  aria-label={`Promote to ${promo === 'q' ? 'Queen' : promo === 'r' ? 'Rook' : promo === 'b' ? 'Bishop' : 'Knight'}`}
                >
                  <div className="w-10 h-10">
                    <PieceSvg type={promo} color={pendingPromotion.color} />
                  </div>
                  <span className="text-[11px] font-medium text-slate-300 mt-1">
                    {promo === 'q' ? 'Queen' : promo === 'r' ? 'Rook' : promo === 'b' ? 'Bishop' : 'Knight'}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setPendingPromotion(null)}
              className="mt-3 w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
