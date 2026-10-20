import { evaluate, planCues, type Clock, type Snapshot } from '@rounds/core';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef } from 'react';
import { useStore } from 'zustand';

import { CuePlayer } from '../../modules/cue-player/src';
import type { SettingsStore } from '../settings/settings-store';
import type { SessionStore } from './session-store';

/**
 * Keeps the native cue player in step with the workout: loads the plan when the workout or cue
 * settings change, and re-anchors playback on every start, pause, resume and skip. Between those
 * events the native side keeps time on its own, including with the screen locked.
 */
export function useWorkoutCues(
  session: SessionStore,
  settings: SettingsStore,
  clock: Clock,
  snapshot: Snapshot | null,
) {
  const workout = useStore(session, (state) => state.workout);
  const cueSettings = useStore(settings, (state) => state.cues);
  const volume = useStore(settings, (state) => state.volume);
  const vibration = useStore(settings, (state) => state.vibration);
  const loaded = useRef<Promise<void>>(Promise.resolve());

  const timeline = workout?.timeline;
  const runState = workout?.runState;

  useEffect(() => {
    CuePlayer.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    if (!timeline) return;
    loaded.current = CuePlayer.load(planCues(timeline, cueSettings));
  }, [timeline, cueSettings]);

  useEffect(() => {
    if (!timeline || !runState) return;
    let cancelled = false;
    void loaded.current.then(() => {
      if (cancelled) return;
      const now = evaluate(runState, timeline, clock.nowUtc());
      if (now.status === 'running') CuePlayer.play(now.positionMs);
      else if (now.status === 'paused') CuePlayer.pause();
      else CuePlayer.stop();
    });
    return () => {
      cancelled = true;
    };
  }, [clock, timeline, runState, cueSettings]);

  useEffect(() => () => CuePlayer.stop(), []);

  // Natural end of the workout: the finish cues have played; release the audio session.
  const finished = snapshot?.status === 'finished';
  useEffect(() => {
    if (!finished) return;
    const timer = setTimeout(() => CuePlayer.stop(), 3000);
    return () => clearTimeout(timer);
  }, [finished]);

  const segmentIndex = snapshot?.segmentIndex;
  const status = snapshot?.status;
  const previousSegment = useRef(segmentIndex);
  useEffect(() => {
    const changed =
      previousSegment.current !== undefined && previousSegment.current !== segmentIndex;
    previousSegment.current = segmentIndex;
    if (changed && vibration && status === 'running') {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [segmentIndex, status, vibration]);
}
