/**
 * $connect route handler.
 * - Writes a connection record (connectionId, ttl=now+2h, no roomID yet).
 * - Sends the initial bare game state (round 0, phase "setup") to the new connection.
 */

import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { addConnection } from '../lib/db';
import { postToConnection } from '../lib/broadcast';

const INITIAL_STATE = {
  meta: {
    type: 'gameState',
    round: 0,
    turn: 0,
    phase: 'setup',
    card: 0,
    score: 0,
  },
};

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    // Write connection record — no roomID yet
    await addConnection(connectionId, null);

    // Send bare initial game state so the client renders the landing page
    await postToConnection(connectionId, INITIAL_STATE);

    return { statusCode: 200, body: 'Connected.' };
  } catch (err) {
    console.error('connect handler error:', err);
    return { statusCode: 500, body: 'Internal server error.' };
  }
};
