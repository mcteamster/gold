import React from 'react';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

/**
 * Buttons — Stay (Yeah) and Bail (Nah) as large tap-target buttons.
 * `canAct` controls the enabled/disabled state.
 */
function Buttons({ canAct, onStay, onBail }) {
  const baseClass =
    'flex-1 flex flex-col items-center justify-center gap-1 rounded-xl py-5 text-white font-bold text-lg transition-all active:scale-95 select-none';
  const disabledClass = 'opacity-30 cursor-not-allowed';

  return (
    <div className="flex gap-3 p-4 pb-safe bg-amber-50 border-t border-amber-200">
      {/* Bail / Nah */}
      <button
        onClick={canAct ? onBail : undefined}
        disabled={!canAct}
        aria-label="Bail — tap or press left arrow"
        className={`${baseClass} bg-red-500 hover:bg-red-600 ${!canAct ? disabledClass : ''}`}
      >
        <ThumbsDown className="w-7 h-7" />
        <span>Bail</span>
      </button>

      {/* Stay / Yeah */}
      <button
        onClick={canAct ? onStay : undefined}
        disabled={!canAct}
        aria-label="Stay — tap or press right arrow"
        className={`${baseClass} bg-green-500 hover:bg-green-600 ${!canAct ? disabledClass : ''}`}
      >
        <ThumbsUp className="w-7 h-7" />
        <span>Stay</span>
      </button>
    </div>
  );
}

export default Buttons;
