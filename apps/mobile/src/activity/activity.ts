import { ActivitiesRepository } from '../data/activities-repository';
import { getDatabase } from '../data/open-database';
import { clock, sessionStore } from '../workout/session';
import { createActivityStore } from './activity-store';
import { activityRecordFor } from './record';

export const activityStore = createActivityStore(
  async () => new ActivitiesRepository(await getDatabase()),
);

/** Saves the current workout to history if it has ended. Safe to call repeatedly. */
export async function recordEndedWorkout(): Promise<void> {
  const workout = sessionStore.getState().workout;
  if (!workout) return;
  const record = activityRecordFor(workout, clock.nowUtc());
  if (record) await activityStore.getState().record(record);
}
