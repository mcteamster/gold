import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Hazards — shows each hazard with an active count indicator.
 * active === 0: grey/inactive
 * active === 1: amber/warning
 * active >= 2:  red/triggered (players eliminated)
 */
function Hazards({ hazards }) {
  return (
    <div className="flex items-center gap-1">
      {hazards.map((hazard) => {
        const isActive = hazard.active > 0;
        const isTriggered = hazard.active >= 2;
        return (
          <div
            key={hazard.id}
            className={`relative flex items-center justify-center rounded-full w-7 h-7 text-base transition-all ${
              isTriggered
                ? 'bg-red-600 text-white shadow-md'
                : isActive
                ? 'bg-amber-400 text-amber-900'
                : 'bg-amber-100 text-amber-300 opacity-50'
            }`}
            title={`Hazard ${hazard.class} — ${hazard.active === 0 ? 'clear' : hazard.active === 1 ? '1 strike' : 'TRIGGERED'}`}
          >
            {/* Game-content emoji preserved (not UI chrome) */}
            <span className="select-none text-sm leading-none">{hazard.symbol}</span>
            {isActive && (
              <span className="absolute -top-1 -right-1 bg-amber-800 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-bold leading-none">
                {hazard.active}
              </span>
            )}
            {isTriggered && (
              <AlertTriangle className="absolute -bottom-1 -right-1 w-3 h-3 text-red-200" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default Hazards;
