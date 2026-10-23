import React from 'react';
import { CheckCircle } from 'lucide-react';

/**
 * Player — player name, colour dot, score bar, and ready status indicator.
 */
function Player({ info, score, turn, readyStatus = {} }) {
  const isLocal = info.id === parseInt(sessionStorage.getItem('playerID'));
  const isActive = info.active === true || info.active === turn;
  const effectiveScore = isActive ? score : 0;
  const total = info.totalScore + effectiveScore;
  const isReady = readyStatus[info.id] === true;

  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1 ${
        !isActive ? 'opacity-40 grayscale' : ''
      } ${isLocal ? 'bg-amber-100' : ''}`}
    >
      {/* Colour dot */}
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: info.colour }}
      />

      {/* Name */}
      <span className={`text-sm flex-1 truncate ${isLocal ? 'font-bold text-amber-900' : 'text-amber-800'}`}>
        {info.name}
      </span>

      {/* Score */}
      <span className="font-mono text-xs text-amber-700 tabular-nums">{total}</span>

      {/* Ready indicator */}
      {isReady && (
        <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
      )}
    </div>
  );
}

export default Player;
