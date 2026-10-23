/**
 * $disconnect route handler.
 * - Deletes the connection record from the connections table.
 */

import { APIGatewayProxyWebsocketHandlerV2 } from 'aws-lambda';
import { removeConnection } from '../lib/db';

export const handler: APIGatewayProxyWebsocketHandlerV2 = async (event) => {
  const connectionId = event.requestContext.connectionId;
  try {
    await removeConnection(connectionId);
    return { statusCode: 200, body: 'Disconnected.' };
  } catch (err) {
    console.error('disconnect handler error:', err);
    return { statusCode: 500, body: 'Internal server error.' };
  }
};
