import React from 'react';
import { Trophy } from 'lucide-react';

/**
 * EndgameScreen — shown during meta.phase === "endgame"
 * Displays players ranked by totalScore descending.
 */
function EndgameScreen({ state }) {
  const { players } = state;

  const ranked = [...players]
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      return a.name > b.name ? 1 : -1;
    });

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 p-6">
      <Trophy className="w-16 h-16 text-amber-500 mb-4" />
      <h1 className="text-3xl font-bold text-amber-800 mb-8">Final Scores</h1>

      <ul className="w-full max-w-sm space-y-3">
        {ranked.map((player, index) => {
          const isLocal = player.id === parseInt(sessionStorage.getItem('playerID'));
          return (
            <li
              key={player.id}
              className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                isLocal
                  ? 'bg-amber-400 text-amber-900 font-bold shadow-md'
                  : 'bg-white text-amber-800 border border-amber-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl w-8 text-center">{medals[index] ?? `${index + 1}.`}</span>
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: player.colour }}
                />
                <span className="text-base">{player.name}</span>
              </div>
              <span className="font-mono font-bold text-lg">{player.totalScore}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-10 text-amber-500 text-sm text-center">
        Thanks for playing Drinkin&apos; Gold! 🍻
      </p>
    </div>
  );
}

export default EndgameScreen;
