import React, { useState, useEffect, useRef } from 'react';

/**
 * Timer — a progress bar that counts down from `turntime` ms.
 * Re-starts whenever `turntime` prop changes.
 * Colour: hazard (red if triggered, else cyan), bonus (yellow), default (amber).
 */
function Timer({ turntime, hazards = [], cardType }) {
  const [remaining, setRemaining] = useState(turntime);
  const intervalRef = useRef(null);
  const startRef = useRef(Date.now());

  useEffect(() => {
    // Reset on new turn
    setRemaining(turntime);
    startRef.current = Date.now();

    if (intervalRef.current) clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const left = Math.max(0, turntime - elapsed);
      setRemaining(left);
      if (left <= 0) clearInterval(intervalRef.current);
    }, 50);

    return () => clearInterval(intervalRef.current);
  }, [turntime]);

  const percent = turntime > 0 ? (remaining / turntime) * 100 : 0;
  const hazardTriggered = hazards.some((h) => h.active >= 2);

  let barClass = 'bg-amber-400';
  if (cardType === 'hazard') {
    barClass = hazardTriggered ? 'bg-red-500' : 'bg-cyan-400';
  } else if (cardType === 'bonus') {
    barClass = 'bg-yellow-400';
  }

  return (
    <div className="w-full h-2 bg-amber-100">
      <div
        className={`h-full transition-none ${barClass}`}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

export default Timer;
