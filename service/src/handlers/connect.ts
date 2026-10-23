/**
 * $connect route handler.
 * - Writes a connection record (connectionId, ttl=now+2h, no roomID yet).
 * - Returns 200 immediately. postToConnection cannot be called during $connect
 *   because the WebSocket handshake is not yet complete — the connection isn't
 *   available for sending until after this handler returns 200.
 *   The client sends an 'enter' message after connecting, which triggers the
 *   message handler to send the initial game state.
 */

import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { addConnection } from '../lib/db';

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    // Write connection record — no roomID yet
    await addConnection(connectionId, null);
    return { statusCode: 200, body: 'Connected.' };
  } catch (err) {
    console.error('connect handler error:', err);
    return { statusCode: 500, body: 'Internal server error.' };
  }
};
