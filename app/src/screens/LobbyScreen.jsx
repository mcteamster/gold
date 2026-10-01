import React, { useState } from 'react';
import { KeyRound, UserPlus, PlayCircle, ArrowRight, ArrowLeft, AlertTriangle } from 'lucide-react';
import Player from '../components/Player';

/**
 * LobbyScreen — shown during meta.phase === "setup"
 * Handles: name input, room code input, Create/Join/Start buttons, player list.
 */
function LobbyScreen({ state, sendMsg, wsRef }) {
  const [name, setName] = useState('');
  const [room, setRoom] = useState('');
  const [mode, setMode] = useState('name'); // 'name' | 'room' | 'joined'
  const [warning, setWarning] = useState('');

  const playerID = parseInt(sessionStorage.getItem('playerID'));
  const isHost = playerID === 1;
  const isJoined = mode === 'joined';

  const handleCreate = () => {
    if (!name.trim()) {
      setWarning('Enter your name first');
      return;
    }
    setWarning('');
    sendMsg('enter', { name: name.trim() });
    setMode('joined');
  };

  const handleJoin = () => {
    if (!name.trim()) {
      setWarning('Enter your name first');
      return;
    }
    if (!room.trim()) {
      setWarning('Enter a room code');
      return;
    }
    setWarning('');
    sendMsg('enter', { roomID: parseInt(room), name: name.trim() });
    setMode('joined');
  };

  const handleStart = () => {
    sendMsg('start');
  };

  // Players who are active (in the lobby)
  const activePlayers = [...state.players]
    .filter((p) => p.active === true)
    .sort((a, b) => a.id - b.id);

  const roomDisplay = state.meta.room !== '0000' ? state.meta.room : '';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-amber-50 p-4">
      {/* Title */}
      <h1 className="text-4xl font-bold text-amber-800 mb-2">Drinkin&apos; Gold</h1>
      <p className="text-sm text-amber-600 mb-6 text-center">
        A 5-day pub crawl! Kick on for points, bail for safety — watch the hazards!
      </p>

      {/* Instructions */}
      {!isJoined && (
        <div className="bg-amber-100 border border-amber-300 rounded-xl p-4 mb-6 max-w-sm w-full text-sm text-amber-800 space-y-2">
          <p className="flex items-center gap-2">
            <ArrowRight className="w-4 h-4 flex-shrink-0" />
            Tap right / press → to kick on and drink more
          </p>
          <p className="flex items-center gap-2">
            <ArrowLeft className="w-4 h-4 flex-shrink-0" />
            Tap left / press ← to bail and grab a bite
          </p>
          <p className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            Two of the same hazard ends your night
          </p>
        </div>
      )}

      {/* Room code display */}
      {roomDisplay && (
        <div className="flex items-center gap-2 text-amber-700 font-mono text-xl mb-4">
          <KeyRound className="w-5 h-5" />
          <span>{roomDisplay}</span>
        </div>
      )}

      {/* Player list */}
      {activePlayers.length > 0 && (
        <ul className="w-full max-w-sm mb-4 space-y-2">
          {activePlayers.map((player) => (
            <li key={player.id}>
              <Player info={player} score={0} />
            </li>
          ))}
        </ul>
      )}

      {/* Join form — hidden once joined */}
      {!isJoined && (
        <div className="w-full max-w-sm space-y-3">
          <input
            className="w-full border border-amber-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            type="text"
            placeholder="Your name"
            maxLength={12}
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <input
            className="w-full border border-amber-300 rounded-lg px-4 py-2 text-base focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white"
            type="number"
            placeholder="Room code (to join)"
            min={1000}
            max={9999}
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          {warning && (
            <p className="text-red-600 text-sm">{warning}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={handleCreate}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold rounded-lg py-3 text-base transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Create
            </button>
            <button
              onClick={handleJoin}
              className="flex-1 flex items-center justify-center gap-2 bg-amber-700 hover:bg-amber-800 active:bg-amber-900 text-white font-semibold rounded-lg py-3 text-base transition-colors"
            >
              <KeyRound className="w-4 h-4" />
              Join
            </button>
          </div>
        </div>
      )}

      {/* Start button — host only, after joining */}
      {isJoined && isHost && (
        <button
          onClick={handleStart}
          className="mt-4 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold rounded-xl py-4 px-10 text-lg transition-colors"
        >
          <PlayCircle className="w-6 h-6" />
          Start Game
        </button>
      )}

      {/* Waiting message after joining (non-host) */}
      {isJoined && !isHost && (
        <p className="mt-6 text-amber-600 text-sm text-center">
          Waiting for the host to start…
        </p>
      )}
    </div>
  );
}

export default LobbyScreen;
