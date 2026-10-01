import React from 'react';
import { Beer } from 'lucide-react';

/**
 * Card — displays the current card: symbol (large), title, description, score.
 * The card background colour pulses based on card type.
 */
function Card({ data, meta }) {
  if (!data) return null;

  const bgClass =
    data.type === 'hazard'
      ? 'bg-red-50 border-red-300'
      : data.type === 'bonus'
      ? 'bg-yellow-50 border-yellow-300'
      : 'bg-white border-amber-200';

  return (
    <div
      className={`flex flex-col items-center justify-center rounded-2xl border-2 shadow-lg p-6 w-full max-w-xs mx-auto ${bgClass}`}
    >
      {/* Symbol — large game-content emoji (preserved per spec) */}
      <span className="text-7xl mb-3 select-none" role="img" aria-label={data.title}>
        {data.symbol}
      </span>

      {/* Title */}
      <h2 className="text-xl font-bold text-amber-900 text-center mb-1">
        {data.title}
      </h2>

      {/* Description */}
      <p className="text-sm text-amber-700 text-center mb-4">
        {data.description}
      </p>

      {/* Score */}
      <div className="flex items-center gap-2 bg-amber-100 rounded-full px-4 py-1 text-amber-800 font-semibold text-sm">
        <Beer className="w-4 h-4" />
        <span>{meta.score} tonight</span>
      </div>
    </div>
  );
}

export default Card;
