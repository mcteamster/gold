import React, { useReducer, useEffect, useRef } from 'react';
import LobbyScreen from './screens/LobbyScreen';
import GameScreen from './screens/GameScreen';
import EndgameScreen from './screens/EndgameScreen';

// ─── Initial State ─────────────────────────────────────────────────────────────

const initialState = {
  meta: {
    room: "0000",
    round: 0,
    turn: 0,
    phase: "setup",
    card: 0,
    score: 0,
    turntime: 0,
  },
  history: [],
  players: [],
  hazards: [
    { id: 1, class: "A", symbol: "🚨", active: 0 },
    { id: 2, class: "B", symbol: "🤮", active: 0 },
    { id: 3, class: "C", symbol: "☣️", active: 0 },
    { id: 4, class: "D", symbol: "🥾", active: 0 },
    { id: 5, class: "E", symbol: "💔", active: 0 },
  ],
  bonuses: [
    { id: 0, symbol: "🥤", active: false, value: 0 },
  ],
  readyStatus: {},
};

// ─── Reducer ───────────────────────────────────────────────────────────────────

function gameReducer(state, action) {
  switch (action.type) {
    case 'SET_STATE': {
      // Full server update — merge preserving readyStatus until next state update resets it
      return { ...state, ...action.payload, readyStatus: {} };
    }
    case 'SET_READY_STATUS': {
      return {
        ...state,
        readyStatus: { ...state.readyStatus, ...action.payload },
      };
    }
    case 'OPTIMISTIC_INTENT': {
      // Immediately reflect local player's intent before server confirms
      const { playerID, intent, turn } = action.payload;
      const players = state.players.map((p) => {
        if (p.id !== playerID) return p;
        return {
          ...p,
          active: intent === 'yeah'
            ? true
            : (p.active === true || p.active === turn ? turn : p.active),
        };
      });
      return { ...state, players };
    }
    default:
      return state;
  }
}

// ─── App ───────────────────────────────────────────────────────────────────────

function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const wsRef = useRef(null);
  // Mirror the latest state into a ref so sendMsg (captured by the keydown
  // listener registered once in a []-deps effect) reads live values instead
  // of the initial-render closure.
  const stateRef = useRef(state);
  stateRef.current = state;

  // ─── sendMsg ─────────────────────────────────────────────────────────────────
  const sendMsg = (type, extraData = {}) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    const msg = {
      playerID: sessionStorage.getItem('playerID'),
      clientSecret: sessionStorage.getItem('clientSecret'),
    };

    if (type === 'yeah' || type === 'nah') {
      const liveState = stateRef.current;
      const playerID = parseInt(sessionStorage.getItem('playerID'));
      const p = liveState.players.find((x) => x.id === playerID);
      const hazardEnd = liveState.hazards.filter((h) => h.active >= 2).length;
      if (!p || hazardEnd > 0) return;
      if (p.active !== true && p.active !== liveState.meta.turn) return;

      // Always include roomID so the server can route to the correct room
      msg.roomID = parseInt(liveState.meta.room, 10);
      msg.data = type === 'yeah';
      dispatch({
        type: 'OPTIMISTIC_INTENT',
        payload: { playerID, intent: type, turn: liveState.meta.turn },
      });
    } else if (type === 'enter') {
      const { roomID, name } = extraData;
      if (roomID) msg.roomID = Math.floor(roomID);
      msg.data = name;
    } else if (type === 'start') {
      // Include roomID so the server routes to the existing room, not a new one
      msg.roomID = parseInt(stateRef.current.meta.room, 10);
      msg.data = 'start';
    }

    wsRef.current.send(JSON.stringify(msg));
  };

  // ─── WebSocket lifecycle ──────────────────────────────────────────────────────
  useEffect(() => {
    const ws = new WebSocket('wss://gold.mcteamster.com'); // Prod
    // const ws = new WebSocket('ws://localhost:8888'); // Dev
    wsRef.current = ws;

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      switch (msg.meta?.type) {
        case 'gameState':
          dispatch({ type: 'SET_STATE', payload: msg });
          break;
        case 'readyStatus':
          dispatch({ type: 'SET_READY_STATUS', payload: msg.meta.data });
          break;
        case 'secret':
          // Only persist identity — do NOT dispatch SET_STATE with the lobby
          // player shape because it would overwrite state.meta (losing phase,
          // round, turn, etc.) until the next broadcastToRoom arrives.
          // The full gameState broadcast immediately follows on the server side.
          sessionStorage.setItem('playerID', msg.id);
          sessionStorage.setItem('clientSecret', msg.secret);
          break;
        case 'rejoin':
          // Server re-sends identity — nothing to update in state
          break;
        case 'error':
          console.error(new Date(), msg.meta.data);
          break;
        default:
          break;
      }
    };

    ws.onerror = (err) => console.error('WebSocket error', err);

    // Keyboard shortcuts
    const handleKeyDown = (e) => {
      switch (e.key) {
        case 'ArrowRight':
          sendMsg('yeah');
          break;
        case 'ArrowLeft':
          sendMsg('nah');
          break;
        default:
          break;
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      ws.close();
      document.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Phase routing ────────────────────────────────────────────────────────────
  const { phase } = state.meta;

  return (
    <div className="min-h-screen bg-amber-50 font-sans select-none">
      {phase === 'setup' && (
        <LobbyScreen state={state} sendMsg={sendMsg} wsRef={wsRef} />
      )}
      {phase === 'play' && (
        <GameScreen state={state} sendMsg={sendMsg} />
      )}
      {phase === 'endgame' && (
        <EndgameScreen state={state} />
      )}
    </div>
  );
}

export default App;
