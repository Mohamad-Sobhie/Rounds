import { endedAtUtc, evaluate } from '@rounds/core';

import type { ActivityRecord } from '../data/activities-repository';
import type { ActiveWorkout } from '../workout/session-store';

/**
 * Builds the history record for a workout that has ended, or null if it is still going (or never
 * started). Uses the moment the workout actually ended, not when the app noticed.
 */
export function activityRecordFor(workout: ActiveWorkout, nowUtc: number): ActivityRecord | null {
  const { runState, timeline } = workout;
  if (!runState) return null;
  const ended = endedAtUtc(runState, timeline, nowUtc);
  if (ended === null) return null;

  const snapshot = evaluate(runState, timeline, ended);
  return {
    id: `${workout.templateId}:${runState.startedAtUtc}`,
    templateId: workout.templateId,
    templateName: workout.templateName,
    activity: workout.activity,
    startedUtc: runState.startedAtUtc,
    endedUtc: ended,
    plannedMs: timeline.totalMs,
    activeMs: snapshot.activeMs,
    outcome: snapshot.status === 'finished' ? 'completed' : 'stopped_early',
  };
}
