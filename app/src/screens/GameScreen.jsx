import React from 'react';
import Card from '../components/Card';
import Hazards from '../components/Hazards';
import Player from '../components/Player';
import Timer from '../components/Timer';
import Buttons from '../components/Buttons';
import cardData from '../data/cardData.json';

/**
 * GameScreen — shown during meta.phase === "play"
 * Layout (mobile-first):
 *   Top strip:  room code · round · hazard indicators
 *   Centre:     card (symbol, title, description, score)
 *   Below card: bonus indicators + player list (with ready status)
 *   Bottom:     Stay / Bail buttons + timer bar
 */
function GameScreen({ state, sendMsg }) {
  const { meta, players, hazards, bonuses, readyStatus } = state;
  const currentCard = cardData[meta.card] ?? cardData[0];
  const playerID = parseInt(sessionStorage.getItem('playerID'));
  const localPlayer = players.find((p) => p.id === playerID);
  const hazardTriggered = hazards.filter((h) => h.active >= 2).length > 0;
  const playerActive =
    localPlayer && (localPlayer.active === true || localPlayer.active === meta.turn);

  // Sort players by score desc for sidebar display
  const sortedPlayers = [...players].sort((a, b) => {
    const scoreA = a.totalScore + ((a.active === true || a.active === meta.turn) ? meta.score : 0);
    const scoreB = b.totalScore + ((b.active === true || b.active === meta.turn) ? meta.score : 0);
    return scoreB - scoreA;
  });

  return (
    <div className="flex flex-col min-h-screen bg-amber-50">

      {/* ── Top strip ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2 bg-amber-800 text-white text-sm">
        <span className="font-mono font-bold">{meta.room}</span>
        <span>Round {meta.round} of 5</span>
        <Hazards hazards={hazards} />
      </div>

      {/* ── Main layout ───────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar — player list */}
        <aside className="hidden md:flex flex-col w-48 border-r border-amber-200 p-3 gap-2 bg-amber-50 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Players</h2>
          {sortedPlayers.map((player) => (
            <Player
              key={player.id}
              info={player}
              score={meta.score}
              turn={meta.turn}
              readyStatus={readyStatus}
            />
          ))}
        </aside>

        {/* Card centrepiece */}
        <main className="flex-1 flex flex-col items-center justify-center p-4">
          <Card data={currentCard} meta={meta} />
        </main>

        {/* Desktop sidebar — bonuses strip */}
        <aside className="hidden md:flex flex-col w-36 border-l border-amber-200 p-3 gap-2 bg-amber-50">
          <h2 className="text-xs font-bold uppercase tracking-widest text-amber-500 mb-1">Bonuses</h2>
          {bonuses.map((bonus) => (
            <div
              key={bonus.id}
              className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm ${
                bonus.active ? 'bg-yellow-200 text-yellow-900 font-bold' : 'text-gray-400'
              }`}
            >
              <span className="text-lg">{bonus.symbol}</span>
              {bonus.active && <span>+{bonus.value || 10}</span>}
            </div>
          ))}
        </aside>
      </div>

      {/* ── Mobile player strip ───────────────────────────────────── */}
      <div className="md:hidden flex overflow-x-auto gap-2 px-4 py-2 bg-amber-100 border-t border-amber-200">
        {sortedPlayers.map((player) => (
          <Player
            key={player.id}
            info={player}
            score={meta.score}
            turn={meta.turn}
            readyStatus={readyStatus}
          />
        ))}
      </div>

      {/* ── Mobile bonus strip ────────────────────────────────────── */}
      {bonuses.some((b) => b.active) && (
        <div className="md:hidden flex justify-center gap-3 px-4 py-1 bg-yellow-100 text-yellow-800 text-sm font-semibold">
          {bonuses.filter((b) => b.active).map((bonus) => (
            <span key={bonus.id}>{bonus.symbol} Bail now for +{bonus.value || 10}!</span>
          ))}
        </div>
      )}

      {/* ── Timer bar ─────────────────────────────────────────────── */}
      <Timer turntime={meta.turntime} hazards={hazards} cardType={currentCard.type} />

      {/* ── Action buttons ────────────────────────────────────────── */}
      <Buttons
        canAct={playerActive && !hazardTriggered && meta.card !== 0}
        onStay={() => sendMsg('yeah')}
        onBail={() => sendMsg('nah')}
      />
    </div>
  );
}

export default GameScreen;
