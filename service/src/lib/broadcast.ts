/**
 * Broadcast helpers: send a message to all connections in a room,
 * pruning stale 410 Gone connections automatically.
 */

import {
  ApiGatewayManagementApiClient,
  PostToConnectionCommand,
  GoneException,
} from '@aws-sdk/client-apigatewaymanagementapi';
import { getConnectionsForRoom, removeConnection } from './db';

/** Post a JSON-serialisable payload to every connection in a room. */
export async function broadcastToRoom(
  roomID: string,
  payload: unknown
): Promise<void> {
  const callbackUrl = process.env.CALLBACK_URL!;
  const agma = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });
  const data = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(data);

  const connectionIds = await getConnectionsForRoom(roomID);

  await Promise.all(
    connectionIds.map(async (connectionId) => {
      try {
        await agma.send(
          new PostToConnectionCommand({
            ConnectionId: connectionId,
            Data: encoded,
          })
        );
      } catch (err) {
        if (err instanceof GoneException) {
          // Stale connection — silently prune
          await removeConnection(connectionId);
        } else {
          // Log but don't abort the whole broadcast
          console.error(`broadcastToRoom: error posting to ${connectionId}:`, err);
        }
      }
    })
  );
}

/** Send a message to a single connection by ID. */
export async function postToConnection(
  connectionId: string,
  payload: unknown
): Promise<void> {
  const callbackUrl = process.env.CALLBACK_URL!;
  const agma = new ApiGatewayManagementApiClient({ endpoint: callbackUrl });
  const data = JSON.stringify(payload);
  const encoded = new TextEncoder().encode(data);

  await agma.send(
    new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: encoded,
    })
  );
}
