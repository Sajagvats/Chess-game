import React from 'react';
import { PieceSymbol } from 'chess.js';
import { PlayerColor } from '../types/chess';

interface PieceSvgProps {
  type: PieceSymbol;
  color: PlayerColor;
  className?: string;
}

export const PieceSvg: React.FC<PieceSvgProps> = ({ type, color, className = 'w-full h-full' }) => {
  const isWhite = color === 'w';
  const fill = isWhite ? '#FAF6EE' : '#1E232A';
  const stroke = isWhite ? '#231F20' : '#0B0D10';
  const detailStroke = isWhite ? '#38322E' : '#8D99AE';
  const innerHighlight = isWhite ? '#FFFFFF' : '#353D49';

  switch (type) {
    case 'p':
      return (
        <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="22.5" cy="12" r="5" />
            <path d="M17.5 18.5c1.6-1.2 8.4-1.2 10 0 .8 2.2.2 4.5-1.4 6.2 2.4 2.8 4.4 6.2 4.9 10.3H14c.5-4.1 2.5-7.5 4.9-10.3-1.6-1.7-2.2-4-1.4-6.2z" />
            <rect x="11.5" y="35" width="22" height="4.5" rx="1.5" />
            {!isWhite && <path d="M16 36.8h13" stroke={detailStroke} strokeWidth="1.1" />}
          </g>
        </svg>
      );

    case 'r':
      return (
        <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 39h23v-4H11v4zM13 35l1.5-2.5h16L32 35H13zM15 32.5V17h15v15.5H15z" />
            <path d="M13 17l-2-3.5V9h4.5v2.5h3.5V9h7v2.5h3.5V9H34v4.5L32 17H13z" />
            <path d="M15.5 21h14M15.5 28h14" stroke={detailStroke} strokeWidth="1.1" fill="none" />
          </g>
        </svg>
      );

    case 'n':
      return (
        <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21" />
            <path d="M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3" />
            <circle cx="15" cy="15.5" r="1" fill={detailStroke} stroke="none" />
            <path d="M12.5 35.5h24" stroke={detailStroke} strokeWidth="1.2" fill="none" />
          </g>
        </svg>
      );

    case 'b':
      return (
        <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 36c3.39-.97 10.11.43 13.5-2 3.39 2.43 10.11 1.03 13.5 2 0 0 1.65.54 3 2-.68.97-1.65.99-3 .5-3.39-.97-10.11.46-13.5-1-3.39 1.46-10.11.03-13.5 1-1.354.49-2.323.47-3-.5 1.354-1.94 3-2 3-2z" />
            <path d="M15 32c2.5 2.5 12.5 2.5 15 0 .5-1.5 0-2 0-2 0-2.5-2.5-4-2.5-4 5.5-1.5 6-11.5-5-15.5-11 4-10.5 14-5 15.5 0 0-2.5 1.5-2.5 4 0 0-.5.5 0 2z" />
            <circle cx="22.5" cy="8" r="2.4" />
            <path d="M18.5 24.5h8M22.5 17v5M20 19.5h5" stroke={detailStroke} strokeWidth="1.3" fill="none" />
          </g>
        </svg>
      );

    case 'q':
      return (
        <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="6" cy="12" r="2.3" />
            <circle cx="14" cy="9" r="2.3" />
            <circle cx="22.5" cy="8" r="2.3" />
            <circle cx="31" cy="9" r="2.3" />
            <circle cx="39" cy="12" r="2.3" />
            <path d="M9 26c8.5-1.5 21-1.5 27 0l2.5-12.5L31 25l-.3-14.1-5.2 13.6-3-14.5-3 14.5-5.2-13.6L14 25 6.5 13.5 9 26z" />
            <path d="M9 26c0 2 1.5 2 2.5 4 1 1.5 1 1 .5 3.5-1.5 1-1.5 2.5-1.5 2.5-1.5 1.5.5 2.5.5 2.5 6.5 1 16.5 1 23 0 0 0 1.5-1 0-2.5 0 0 .5-1.5-1-2.5-.5-2.5-.5-2 .5-3.5 1-2 2.5-2 2.5-4-8.5-1.5-18.5-1.5-27 0z" />
            <path d="M11.5 30c3.5-1 18.5-1 22 0M12 33.5c6-1 15-1 21 0" stroke={detailStroke} strokeWidth="1.1" fill="none" />
          </g>
        </svg>
      );

    case 'k':
      return (
        <svg viewBox="0 0 45 45" className={className} aria-hidden="true">
          <g fill={fill} stroke={stroke} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22.5 11.63V6M20 8h5" stroke={isWhite ? '#231F20' : '#D4A017'} strokeWidth="2" fill="none" />
            <path d="M22.5 25s4.5-7.5 3-10.5c0 0-1-2.5-3-2.5s-3 2.5-3 2.5c-1.5 3 3 10.5 3 10.5" fill={innerHighlight} />
            <path d="M11.5 37c5.5 3.5 15.5 3.5 21 0v-7s9-4.5 6-10.5c-4-6.5-13.5-3.5-16 4V27v-3.5c-3.5-7.5-13-10.5-16-4-3 6 5 10 5 10V37z" />
            <path d="M11.5 30c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0m-21 3.5c5.5-3 15.5-3 21 0" stroke={detailStroke} strokeWidth="1.15" fill="none" />
          </g>
        </svg>
      );
  }
};
