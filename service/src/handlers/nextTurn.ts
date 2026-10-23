/**
 * nextTurn handler — invoked by EventBridge Scheduler.
 *
 * Event payload: { roomID: string, scheduleName: string }
 *
 * Steps:
 *  1. Read game state from DynamoDB
 *  2. Call updateGameState (or resetRound if all eliminated)
 *  3. If phase=play: create new schedule for next turn
 *  4. If phase=endgame: clean up connections for the room
 *  5. Write updated game state
 *  6. Broadcast to all room connections
 */

import { Handler } from 'aws-lambda';
import { getGameState, putGameState, getConnectionsForRoom, removeConnection } from '../lib/db';
import { broadcastToRoom } from '../lib/broadcast';
import { updateGameState } from '../model/gameState';
import { createTurnSchedule, turnScheduleName } from '../lib/scheduler';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

interface NextTurnEvent {
  roomID: string;
  scheduleName?: string;
}

export const handler: Handler<NextTurnEvent, void> = async (event) => {
  await advanceTurn(event.roomID);
};

/**
 * Core turn-advance logic, callable from the handler and from message.ts
 * (early-advance path when all players vote).
 */
export async function advanceTurn(roomID: string): Promise<void> {
  // Retry loop for conditional write conflicts (up to 3 attempts)
  let attempts = 0;
  while (attempts < 3) {
    const stored = await getGameState(roomID);
    if (!stored) {
      console.warn(`advanceTurn: no game state found for room ${roomID}`);
      return;
    }

    const { gameState: gs, lobbyPlayers, colours } = stored;

    if (gs.meta.phase !== 'play') {
      // Nothing to do if not in play phase
      return;
    }

    // Advance game state
    updateGameState(gs);

    try {
      await putGameState(roomID, { gameState: gs, lobbyPlayers, colours });

      // Post-write actions
      if (gs.meta.phase === 'play') {
        // Schedule the next turn
        await createTurnSchedule(roomID, gs.meta.turn, gs.meta.turntime, {
          roomID,
          scheduleName: turnScheduleName(roomID, gs.meta.turn),
        });
      } else if (gs.meta.phase === 'endgame') {
        // Clean up all connection records for this room
        const connectionIds = await getConnectionsForRoom(roomID);
        await Promise.all(connectionIds.map((cid) => removeConnection(cid)));
      }

      // Broadcast updated state to all room connections
      await broadcastToRoom(roomID, gs);
      return;

    } catch (err) {
      if (err instanceof ConditionalCheckFailedException && attempts < 2) {
        attempts++;
        await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempts)));
        continue;
      }
      throw err;
    }
  }
}
