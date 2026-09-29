/**
 * $default route handler — routes all game messages.
 *
 * Incoming message shape (from client):
 *   { roomID, playerID, clientSecret, data }
 *
 * Routing logic:
 *   - No roomID (or non-numeric): create new lobby
 *   - Valid 4-digit roomID: join existing lobby
 *   - Authenticated + phase=setup + playerID=1 + data="start": start game
 *   - Authenticated + phase=setup + data=string: add player
 *   - Authenticated + phase=play: set intent
 */

import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import {
  getGameState,
  putGameState,
  updateConnectionRoom,
  StoredGameState,
  getConnectionsForRoom,
  removeConnection,
} from '../lib/db';
import { broadcastToRoom, postToConnection } from '../lib/broadcast';
import {
  createGameState,
  setIntent,
  getActive,
} from '../model/gameState';
import { addPlayer, authPlayer, checkPlayer, COLOURS } from '../model/lobby';
import { createTurnSchedule, deleteTurnSchedule, turnScheduleName } from '../lib/scheduler';
import { ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';

const TURN_DURATION_MS = 30_000; // 30 seconds

interface GameMessage {
  roomID?: string | number;
  playerID?: string | number;
  clientSecret?: string | number;
  data?: unknown;
}

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;

  let msg: GameMessage;
  try {
    msg = JSON.parse(event.body ?? '{}');
  } catch {
    return { statusCode: 400, body: 'Bad request.' };
  }

  const roomID = msg.roomID;
  const room = parseInt(String(roomID ?? ''), 10);

  try {
    // ── 7.2/7.3: Lobby init ───────────────────────────────────────────────
    if (!roomID || isNaN(room) || room < 1000 || room > 9999) {
      // Possibly creating a new lobby, or a roomID was given that doesn't look right
      if (roomID !== undefined && !isNaN(room)) {
        // Numeric but out of range — treat as missing room
        await postToConnection(connectionId, {
          meta: { type: 'error', data: 'Room is missing, game may no longer be in progress.', code: 'missingRoom' },
        });
        return { statusCode: 200, body: 'OK' };
      }

      // Create a new lobby
      let newRoomID: string | null = null;
      for (let retries = 0; retries < 10; retries++) {
        const candidate = String(Math.floor(Math.random() * 1000 + 1000));
        const existing = await getGameState(candidate);
        if (!existing) {
          newRoomID = candidate;
          break;
        }
      }

      if (!newRoomID) {
        await postToConnection(connectionId, {
          meta: { type: 'error', data: 'Could not start a room, please try again later.' },
        });
        return { statusCode: 200, body: 'OK' };
      }

      const gs = createGameState(newRoomID);
      gs.version = 0; // first write — putGameState uses attribute_not_exists condition when version is 0

      const stored: StoredGameState = {
        gameState: gs,
        lobbyPlayers: [],
        colours: [...COLOURS],
      };

      await putGameState(newRoomID, stored);
      await updateConnectionRoom(connectionId, newRoomID);
      await broadcastToRoom(newRoomID, gs);

      return { statusCode: 200, body: 'OK' };
    }

    // Valid 4-digit roomID — look up existing game
    const roomStr = String(room);
    const stored = await getGameState(roomStr);

    if (!stored) {
      await postToConnection(connectionId, {
        meta: { type: 'error', data: 'Room is missing, game may no longer be in progress.' },
      });
      return { statusCode: 200, body: 'OK' };
    }

    const { gameState: gs, lobbyPlayers, colours } = stored;

    // Associate connection with room (in case they're re-joining)
    await updateConnectionRoom(connectionId, roomStr);

    // Authenticate
    const authed = authPlayer(lobbyPlayers, msg.playerID ?? '', msg.clientSecret ?? '');

    switch (gs.meta.phase) {
      case 'setup': {
        if (authed && String(msg.playerID) === '1' && msg.data === 'start') {
          // ── 7.5: Start game ──────────────────────────────────────────────
          gs.meta.phase = 'play';
          gs.meta.turntime = TURN_DURATION_MS;
          gs.version++;

          await putGameState(roomStr, { gameState: gs, lobbyPlayers, colours });
          await broadcastToRoom(roomStr, gs);

          // Create first turn schedule
          await createTurnSchedule(roomStr, gs.meta.turn, TURN_DURATION_MS, {
            roomID: roomStr,
            scheduleName: turnScheduleName(roomStr, gs.meta.turn),
          });

        } else if (checkPlayer(lobbyPlayers, String(msg.data ?? ''), msg.clientSecret ?? '')) {
          // Re-join
          await postToConnection(connectionId, { meta: { type: 'rejoin', data: 'Welcome Back' } });
          await broadcastToRoom(roomStr, gs);

        } else if (lobbyPlayers.find((x) => x.name === String(msg.data ?? ''))) {
          // Name collision
          await postToConnection(connectionId, {
            meta: { type: 'error', data: 'Someone has already taken that name!', code: 'takenName' },
          });

        } else {
          // ── 7.4: Add player ──────────────────────────────────────────────
          const result = addPlayer(lobbyPlayers, colours, gs, String(msg.data ?? ''));
          if (typeof result === 'string') {
            // Error (name taken)
            await postToConnection(connectionId, { meta: { type: 'error', data: result } });
          } else {
            // Send secret to the new player's connection
            await postToConnection(connectionId, result);
            gs.version++;
            await putGameState(roomStr, { gameState: gs, lobbyPlayers, colours });
            await broadcastToRoom(roomStr, gs);
          }
        }
        break;
      }

      case 'play': {
        // ── 7.6: Set intent ──────────────────────────────────────────────
        if (!authed) break;

        // Optimistic locking retry loop (max 3 attempts)
        let attempts = 0;
        while (attempts < 3) {
          const currentStored = await getGameState(roomStr);
          if (!currentStored) break;
          const currentGs = currentStored.gameState;

          const voted = setIntent(currentGs, {
            playerID: msg.playerID ?? '',
            data: !!msg.data,
          });
          if (!voted) break;

          const active = getActive(currentGs);
          const allVoted = active.length > 0 && active.every((p) => voted[p.id]);

          try {
            currentGs.version++;
            await putGameState(roomStr, { ...currentStored, gameState: currentGs });

            if (allVoted) {
              // Cancel the schedule that was created for this turn.
              // The schedule name uses the CURRENT turn number (meta.turn is not
              // incremented by setIntent — only updateGameState increments it).
              const sched = turnScheduleName(roomStr, currentGs.meta.turn);
              await deleteTurnSchedule(sched);
              // Invoke nextTurn inline by re-using nextTurn logic (avoid circular dep)
              const { advanceTurn } = await import('./nextTurn');
              await advanceTurn(roomStr);
            } else {
              await broadcastToRoom(roomStr, { meta: { type: 'readyStatus', data: voted } });
            }
            break;
          } catch (err) {
            if (err instanceof ConditionalCheckFailedException && attempts < 2) {
              attempts++;
              await new Promise((r) => setTimeout(r, 100 * Math.pow(2, attempts)));
              continue;
            }
            throw err;
          }
        }
        break;
      }

      case 'endgame':
        // No-op
        break;

      default:
        break;
    }

    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('message handler error:', err);
    return { statusCode: 500, body: 'Internal server error.' };
  }
};
