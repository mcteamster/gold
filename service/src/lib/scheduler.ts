/**
 * EventBridge Scheduler helpers.
 * Creates and deletes one-shot schedules for turn timers.
 */

import {
  SchedulerClient,
  CreateScheduleCommand,
  DeleteScheduleCommand,
  ResourceNotFoundException,
  FlexibleTimeWindow,
  FlexibleTimeWindowMode,
} from '@aws-sdk/client-scheduler';

const schedulerClient = new SchedulerClient({
  region: process.env.AWS_REGION ?? 'ap-southeast-2',
});

const SCHEDULER_GROUP = process.env.SCHEDULER_GROUP ?? 'gold-turns';
const SCHEDULER_ROLE_ARN = process.env.SCHEDULER_ROLE_ARN!;

/**
 * Get the NextTurn Lambda ARN.
 * - In message handler: from NEXT_TURN_FUNCTION_ARN env var (set by CDK)
 * - In nextTurn handler itself: derive from function name + region + account
 */
function getNextTurnArn(): string {
  if (process.env.NEXT_TURN_FUNCTION_ARN) {
    return process.env.NEXT_TURN_FUNCTION_ARN;
  }
  // In the nextTurn Lambda itself — build ARN from context
  const region = process.env.AWS_REGION ?? 'ap-southeast-2';
  const accountId = process.env.AWS_ACCOUNT_ID ?? '';
  return `arn:aws:lambda:${region}:${accountId}:function:gold-next-turn`;
}

/**
 * Create a one-shot schedule that invokes nextTurn after `delayMs` ms.
 * The schedule name encodes roomID and turn number for easy deletion.
 */
export async function createTurnSchedule(
  roomID: string,
  turn: number,
  delayMs: number,
  payload: unknown
): Promise<string> {
  const scheduleTime = new Date(Date.now() + delayMs);
  // EventBridge Scheduler uses UTC in the format: yyyy-MM-ddTHH:mm:ss
  const scheduleExpression = `at(${scheduleTime.toISOString().slice(0, 19)})`;
  const scheduleName = `gold-turn-${roomID}-${turn}`;

  const flexibleWindow: FlexibleTimeWindow = {
    Mode: FlexibleTimeWindowMode.OFF,
  };

  await schedulerClient.send(
    new CreateScheduleCommand({
      Name: scheduleName,
      GroupName: SCHEDULER_GROUP,
      ScheduleExpression: scheduleExpression,
      ScheduleExpressionTimezone: 'UTC',
      FlexibleTimeWindow: flexibleWindow,
      Target: {
        Arn: getNextTurnArn(),
        RoleArn: SCHEDULER_ROLE_ARN,
        Input: JSON.stringify(payload),
      },
      // Auto-delete after firing
      ActionAfterCompletion: 'DELETE',
    })
  );

  return scheduleName;
}

/** Delete a turn schedule (if it exists — silently ignore if already deleted). */
export async function deleteTurnSchedule(scheduleName: string): Promise<void> {
  try {
    await schedulerClient.send(
      new DeleteScheduleCommand({
        Name: scheduleName,
        GroupName: SCHEDULER_GROUP,
      })
    );
  } catch (err) {
    if (err instanceof ResourceNotFoundException) {
      // Already deleted (fired or early advance) — not an error
      return;
    }
    throw err;
  }
}

/** Schedule name for a given room+turn (for cancellation on early advance) */
export function turnScheduleName(roomID: string, turn: number): string {
  return `gold-turn-${roomID}-${turn}`;
}
