import type { Cue } from '@rounds/core';
import { requireOptionalNativeModule } from 'expo-modules-core';

interface NativeCuePlayer {
  load(atMs: number[], kinds: string[], texts: string[]): Promise<void>;
  play(positionMs: number): void;
  pause(): void;
  stop(): void;
  setVolume(volume: number): void;
}

const native = requireOptionalNativeModule<NativeCuePlayer>('CuePlayer');

/**
 * Plays a cue plan on the native audio timeline. On platforms without the native module
 * (Android for now, tests) every call is a no-op.
 */
export const CuePlayer = {
  isAvailable: native !== null,

  load(cues: readonly Cue[]): Promise<void> {
    if (!native) return Promise.resolve();
    return native.load(
      cues.map((cue) => cue.atMs),
      cues.map((cue) => cue.kind),
      cues.map((cue) => cue.text ?? ''),
    );
  },

  play(positionMs: number): void {
    native?.play(positionMs);
  },

  pause(): void {
    native?.pause();
  },

  stop(): void {
    native?.stop();
  },

  setVolume(volume: number): void {
    native?.setVolume(volume);
  },
};
