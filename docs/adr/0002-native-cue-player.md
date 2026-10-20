# 0002. Play cues from a native audio timeline

- Status: accepted
- Date: 2026-10-20

## Context

Cues are the core of the app: the user is on a machine and not looking at the phone. Beeps and
spoken announcements must fire on time with the screen locked, for 30–60 minutes, while their own
music keeps playing. On iOS, JavaScript timers stop when the app is suspended, so cues can't be
driven from JS. App Review also rejects apps that keep themselves alive with a silent audio loop.

## Decision

A local Expo module (`apps/mobile/modules/cue-player`) receives the full cue plan computed by
`@rounds/core` and schedules it on an `AVAudioEngine` timeline:

- Beeps and chimes are synthesized sine tones (no assets).
- Speech is pre-rendered with `AVSpeechSynthesizer.write` into PCM buffers when the workout loads,
  so it can be scheduled exactly like the beeps.
- Two player nodes (sounds and speech) so a chime and an announcement can overlap.
- JS only re-anchors playback on state changes: `play(positionMs)` on start, resume and skip;
  `pause()`; `stop()`. Between those, timing is entirely native and sample-accurate.
- `AVAudioSession` category `.playback` with `.mixWithOthers`, and the `audio` background mode.
  The app is genuinely producing audio, which is the documented use of that mode.
- Interruptions (calls, Siri) and media-services resets resume at the position the workout has
  reached in the meantime.

## Alternatives considered

- **JS timers + `expo-speech` / `expo-audio`.** Simple, but stops when the app is suspended.
- **Local notifications with sounds.** Survive suspension, but limited to 64 pending, no speech,
  and notification sounds don't mix well with music.
- **Silent audio loop to stay alive.** Works technically, but is an App Review risk.

## Consequences

- Cue timing no longer depends on the JS thread or the screen state.
- Android needs its own implementation (foreground service), tracked in #17.
- Not yet done: ducking music during speech (needs session reconfiguration timed around each
  announcement), and real-device validation of a long locked-screen session (#4).
