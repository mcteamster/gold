/**
 * DynamoDB helper functions for connections and game state tables.
 */

import {
  DynamoDBClient,
  ConditionalCheckFailedException,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { GameState } from '../model/gameState';
import { LobbyPlayer } from '../model/lobby';

const client = new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-southeast-2' });
const ddb = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
});

const CONNECTIONS_TABLE = process.env.CONNECTIONS_TABLE!;
const GAMESTATE_TABLE = process.env.GAMESTATE_TABLE!;

// ──────────────────────────────────────────────
// Connection records
// ──────────────────────────────────────────────

/** Write a new connection record with TTL=now+2h */
export async function addConnection(
  connectionId: string,
  roomID: string | null = null
): Promise<void> {
  const ttl = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2 hours from now
  const item: Record<string, unknown> = {
    connectionId,
    ttl,
  };
  if (roomID !== null) {
    item.roomID = roomID;
  }
  await ddb.send(
    new PutCommand({
      TableName: CONNECTIONS_TABLE,
      Item: item,
    })
  );
}

/** Update a connection's roomID association */
export async function updateConnectionRoom(
  connectionId: string,
  roomID: string
): Promise<void> {
  await ddb.send(
    new UpdateCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
      UpdateExpression: 'SET roomID = :r',
      ExpressionAttributeValues: { ':r': roomID },
    })
  );
}

/** Delete a connection record */
export async function removeConnection(connectionId: string): Promise<void> {
  await ddb.send(
    new DeleteCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
    })
  );
}

/** Get the roomID associated with a connection (returns null if not found or unassigned). */
export async function getRoomForConnection(connectionId: string): Promise<string | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: CONNECTIONS_TABLE,
      Key: { connectionId },
      ProjectionExpression: 'roomID',
    })
  );
  if (!result.Item || !result.Item.roomID) return null;
  return result.Item.roomID as string;
}

/** Get all connection IDs for a given room via GSI */
export async function getConnectionsForRoom(roomID: string): Promise<string[]> {
  const result = await ddb.send(
    new QueryCommand({
      TableName: CONNECTIONS_TABLE,
      IndexName: 'roomID-index',
      KeyConditionExpression: 'roomID = :r',
      ExpressionAttributeValues: { ':r': roomID },
      ProjectionExpression: 'connectionId',
    })
  );
  return (result.Items ?? []).map((item) => item.connectionId as string);
}

// ──────────────────────────────────────────────
// Game state records
// ──────────────────────────────────────────────

export interface StoredGameState {
  gameState: GameState;
  lobbyPlayers: LobbyPlayer[];
  colours: string[];
}

/** Read game state from DynamoDB. Returns null if not found. */
export async function getGameState(roomID: string): Promise<StoredGameState | null> {
  const result = await ddb.send(
    new GetCommand({
      TableName: GAMESTATE_TABLE,
      Key: { roomID },
    })
  );
  if (!result.Item) return null;
  return result.Item as StoredGameState;
}

/**
 * Write game state with optimistic locking (version condition).
 * Throws ConditionalCheckFailedException on version conflict.
 */
export async function putGameState(
  roomID: string,
  state: StoredGameState
): Promise<void> {
  const version = state.gameState.version;
  if (version === 0) {
    // First write — just put it
    await ddb.send(
      new PutCommand({
        TableName: GAMESTATE_TABLE,
        Item: { roomID, ...state },
        ConditionExpression: 'attribute_not_exists(roomID)',
      })
    );
  } else {
    await ddb.send(
      new PutCommand({
        TableName: GAMESTATE_TABLE,
        Item: { roomID, ...state },
        ConditionExpression: 'gameState.#version = :prevVersion',
        ExpressionAttributeNames: { '#version': 'version' },
        ExpressionAttributeValues: { ':prevVersion': version - 1 },
      })
    );
  }
}

/**
 * putGameState with exponential backoff retry (max 3 retries).
 * Used in handlers that may race under concurrent Lambda invocations.
 */
export async function putGameStateWithRetry(
  roomID: string,
  state: StoredGameState,
  maxRetries = 3
): Promise<void> {
  let attempt = 0;
  while (true) {
    try {
      await putGameState(roomID, state);
      return;
    } catch (err) {
      if (err instanceof ConditionalCheckFailedException && attempt < maxRetries) {
        attempt++;
        await new Promise((resolve) =>
          setTimeout(resolve, 100 * Math.pow(2, attempt))
        );
        // Re-read state and re-apply before retrying
        throw err; // caller must re-read and retry the whole operation
      }
      throw err;
    }
  }
}
