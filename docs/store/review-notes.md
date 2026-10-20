# Notes for App Review

Rounds is an interval timer for cardio machines (treadmill, bike, rower).

**Background audio (UIBackgroundModes: audio).** The app's core function is audible coaching
during a workout: countdown beeps in the last seconds of each interval, a chime when the next
interval starts, and spoken announcements such as "Level 8, 1 minute". Users are on a machine and
not looking at the phone, often with the screen locked. The background audio mode is used only
while a workout is running, to play these cues. The audio session mixes with other apps, so the
user's own music keeps playing.

**How to try it:**

1. Open the app and tap the play button next to "Two-minute demo".
2. Tap the large ring to start.
3. Lock the phone: beeps and spoken cues continue for the whole two minutes.

No account or sign-in is needed. The app collects no data.
