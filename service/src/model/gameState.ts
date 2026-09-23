/**
 * GameState model — pure functions (no class, takes/returns state).
 * Mirrors the JS GameState class logic from model/gameState.js.
 */

import cardData from '../../data/cardData.json';

export interface CardData {
  id: number;
  type: string;
  value?: number;
  class?: string;
  symbol: string;
  title: string;
  description: string;
}

export interface Player {
  id: number;
  colour: string[];
  name: string;
  roundScores: (number | undefined)[];
  totalScore: number;
  active: boolean | number; // true = still in, false = eliminated, number = turn they left
}

export interface Hazard {
  id: number;
  class: string;
  symbol: string;
  active: number;
}

export interface Bonus {
  id: number;
  class: string;
  symbol: string;
  active: boolean | number;
  value: number;
}

export interface GameMeta {
  type: string;
  room: string;
  round: number;
  turn: number;
  phase: string;
  card: number;
  score: number;
  turntime: number;
}

export interface GameState {
  meta: GameMeta;
  deck: number[];
  history: (CardData & { drawnTurn: number })[];
  burnt: number[];
  voted: Record<number, boolean>;
  delta: unknown[];
  players: Player[];
  hazards: Hazard[];
  bonuses: Bonus[];
  version: number; // optimistic locking counter
}

/** Create a fresh game state for a new room */
export function createGameState(roomID: string): GameState {
  return {
    meta: {
      type: 'gameState',
      room: roomID,
      round: 1,
      turn: 1,
      phase: 'setup',
      card: 0,
      score: 1,
      turntime: 0,
    },
    deck: Array.from({ length: (cardData as CardData[]).length }, (_, i) => i),
    history: [],
    burnt: [],
    voted: {},
    delta: [],
    players: [],
    hazards: [
      { id: 1, class: 'A', symbol: '🚨', active: 0 },
      { id: 2, class: 'B', symbol: '🤮', active: 0 },
      { id: 3, class: 'C', symbol: '☣️', active: 0 },
      { id: 4, class: 'D', symbol: '🥾', active: 0 },
      { id: 5, class: 'E', symbol: '💔', active: 0 },
    ],
    bonuses: [
      { id: 0, class: 'B0', symbol: '🥤', active: false, value: 0 },
      { id: 1, class: 'B1', symbol: '🍗', active: 0, value: 0 },
      { id: 2, class: 'B2', symbol: '🌮', active: 0, value: 0 },
      { id: 3, class: 'B3', symbol: '🍕', active: 0, value: 0 },
      { id: 4, class: 'B4', symbol: '🍟', active: 0, value: 0 },
      { id: 5, class: 'B5', symbol: '🍜', active: 0, value: 0 },
    ],
    version: 0,
  };
}

/** Record a player's intent (stay/leave). Returns updated voted map or false on error. */
export function setIntent(
  gs: GameState,
  player: { playerID: number | string; data: boolean; clientSecret?: string }
): Record<number, boolean> | false {
  try {
    const p = gs.players.find((x) => x.id == (player.playerID as number));
    if (!p) return false;
    if (p.active === true || p.active === gs.meta.turn) {
      p.active = player.data === true ? true : gs.meta.turn;
      gs.voted[p.id] = true;
    }
    return gs.voted;
  } catch (err) {
    console.error(new Date(), err);
    return false;
  }
}

/** Returns players still active in the current turn */
export function getActive(gs: GameState): Player[] {
  return gs.players.filter(
    (p) => p.active === true || p.active === gs.meta.turn
  );
}

/** Advance game state to the next turn (mutates in place, returns updated state) */
export function updateGameState(gs: GameState): GameState {
  // Reduce turn timer by 2% each turn
  gs.meta.turntime *= 0.98;

  const cards = cardData as CardData[];
  const card = Object.assign({}, cards[gs.meta.card]) as CardData & { drawnTurn: number };
  card.drawnTurn = gs.meta.turn;
  gs.history.push(card);
  gs.deck = gs.deck.filter((c) => c !== gs.meta.card);
  gs.meta.turn++;
  gs.voted = {};

  // Score leavers
  const leavers = gs.players.filter((p) => p.active === gs.meta.turn - 1);
  leavers.forEach((player) => {
    let score = gs.meta.score;
    gs.bonuses.filter((b) => b.active !== 0).forEach((bonus) => {
      score += bonus.value;
    });
    player.roundScores[gs.meta.round - 1] = score;
    player.totalScore += score;
  });

  // Burn active bonuses (not B0)
  gs.bonuses.forEach((bonus) => {
    if (bonus.class !== 'B0' && bonus.active === true) {
      bonus.active = 0;
      const burned = (cardData as CardData[]).find((c) => c.class === bonus.class);
      if (burned) gs.burnt.push(burned.id);
    }
    bonus.value = 0;
  });

  const activePlayers = gs.players.filter(
    (p) => p.active === true || p.active === gs.meta.turn
  );

  if (activePlayers.length > 0) {
    // Pick next card from deck
    gs.meta.card = gs.deck[Math.floor(Math.random() * gs.deck.length)];
    const newCard = cards[gs.meta.card];

    switch (newCard?.type) {
      case 'points': {
        const nActive = gs.players.filter(
          (p) => p.active === true || p.active === gs.meta.turn
        ).length;
        if (nActive > 3) {
          gs.meta.score += newCard.value ?? 0;
        } else if (nActive > 1) {
          gs.meta.score += (newCard.value ?? 0) * 2;
        } else {
          gs.meta.score += (newCard.value ?? 0) * 3;
        }
        break;
      }
      case 'hazard': {
        const hazard = gs.hazards.find((h) => h.class === newCard.class);
        if (hazard && ++hazard.active === 2) {
          const losers = gs.players.filter(
            (p) => p.active === true || p.active === gs.meta.turn
          );
          losers.forEach((player) => {
            player.roundScores[gs.meta.round - 1] = 0;
            player.active = false;
          });
          gs.burnt.push(newCard.id);
        }
        break;
      }
      case 'bonus': {
        const bonus = gs.bonuses.find((b) => b.class === newCard.class);
        if (bonus) {
          bonus.active = true;
          bonus.value = 10;
        }
        break;
      }
      default:
        console.error(new Date(), 'Card type mismatch:', newCard?.type);
    }
  } else {
    resetRound(gs);
  }

  gs.version++;
  return gs;
}

/** Reset game state for a new round (mutates in place) */
export function resetRound(gs: GameState): GameState {
  // Burn unclaimed bonuses
  gs.bonuses.forEach((bonus) => {
    if (bonus.class !== 'B0' && bonus.active === true) {
      bonus.active = 0;
      const burned = (cardData as CardData[]).find((c) => c.class === bonus.class);
      if (burned) gs.burnt.push(burned.id);
    }
    bonus.value = 0;
  });

  // Deactivate hazards
  gs.hazards.forEach((hazard) => {
    hazard.active = 0;
  });

  // Reactivate players
  gs.players.forEach((player) => {
    player.active = true;
  });

  // Replenish deck (excluding burnt cards)
  gs.deck = Array.from(
    { length: (cardData as CardData[]).length },
    (_, i) => i
  ).filter((b) => !gs.burnt.includes(b));

  gs.meta.card = 0;
  gs.meta.score = ++gs.meta.round;

  if (gs.meta.round > 5) {
    gs.meta.phase = 'endgame';
  }

  return gs;
}
