import { formatClock, type SegmentKind } from '@rounds/core';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { recordEndedWorkout } from '@/activity/activity';
import { Icon } from '@/components/icon';
import { settingsStore } from '@/settings/settings';
import { colors, fonts, phaseColors, space } from '@/theme';
import { ProgressRings } from '@/workout/progress-rings';
import { clock, sessionStore } from '@/workout/session';
import { StepsSheet } from '@/workout/steps-sheet';
import { useSnapshot } from '@/workout/use-snapshot';
import { useWorkoutCues } from '@/workout/use-workout-cues';
import { workoutView } from '@/workout/view-model';

const phaseNames: Record<SegmentKind, string> = {
  warmup: 'Warm-up',
  work: 'Work',
  rest: 'Rest',
  recovery: 'Recovery',
  cooldown: 'Cooldown',
};

export default function WorkoutScreen() {
  useKeepAwake();
  const workout = useStore(sessionStore, (state) => state.workout);
  const dispatch = useStore(sessionStore, (state) => state.dispatch);
  const snapshot = useSnapshot(sessionStore, clock);
  useWorkoutCues(sessionStore, settingsStore, clock, snapshot);

  const ended = snapshot?.status === 'finished' || snapshot?.status === 'stopped';
  useEffect(() => {
    if (ended) void recordEndedWorkout();
  }, [ended]);
  const { width, height } = useWindowDimensions();
  const [showSteps, setShowSteps] = useState(false);

  if (!workout) return <Redirect href="/" />;

  const view = workoutView(workout.timeline, snapshot);
  const accent = phaseColors[view.phase];
  const fg = colors.ink;
  const ringSize = Math.min(width - space.xxl * 2, height * 0.4);

  const close = () => {
    sessionStore.getState().clear();
    router.replace('/');
  };

  if (snapshot && (snapshot.status === 'finished' || snapshot.status === 'stopped')) {
    return (
      <Summary
        finished={snapshot.status === 'finished'}
        activeMs={snapshot.activeMs}
        plannedMs={workout.timeline.totalMs}
        name={workout.templateName}
        onClose={close}
      />
    );
  }

  const isReady = view.status === 'ready';
  const isPaused = view.status === 'paused';

  const togglePause = () => {
    if (isReady) dispatch('start');
    else dispatch(isPaused ? 'resume' : 'pause');
  };

  const confirmEnd = () => {
    if (isReady) return close();
    Alert.alert('End workout?', "You won't be able to resume it.", [
      { text: 'Keep going', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => dispatch('stop') },
    ]);
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ gestureEnabled: false, animation: 'fade' }} />
      <StatusBar style="dark" />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <IconButton icon="xmark" color={fg} onPress={confirmEnd} label="End workout" />
          <Text
            maxFontSizeMultiplier={1.2}
            style={[styles.phase, { color: isPaused ? colors.muted : accent }]}
          >
            {isPaused ? 'Paused' : phaseNames[view.phase]}
          </Text>
          <Pressable
            onPress={() => setShowSteps(true)}
            hitSlop={12}
            style={styles.iconButton}
            accessibilityRole="button"
            accessibilityLabel="Show all steps"
          >
            <Icon name="list.bullet" color={fg} />
          </Pressable>
        </View>

        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.label, { color: accent }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          accessibilityRole="header"
        >
          {view.label}
        </Text>

        <Pressable
          onPress={togglePause}
          style={styles.ringArea}
          accessibilityRole="button"
          accessibilityLabel={isReady ? 'Start' : isPaused ? 'Resume' : 'Pause'}
        >
          <ProgressRings
            size={ringSize}
            segmentProgress={snapshot?.segmentProgress ?? 0}
            totalProgress={snapshot?.totalProgress ?? 0}
            segmentDurationMs={snapshot?.segment.durationMs ?? 1}
            totalDurationMs={workout.timeline.totalMs}
            running={view.status === 'running'}
            color={accent}
            trackColor={colors.track}
          />
          <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[
                styles.countdown,
                { color: isPaused ? colors.muted : fg, fontSize: ringSize * 0.34 },
              ]}
            >
              {view.countdown}
            </Text>
            {isReady && (
              <Text maxFontSizeMultiplier={1.2} style={[styles.hint, { color: colors.muted }]}>
                Tap to start
              </Text>
            )}
          </View>
        </Pressable>

        <Text
          maxFontSizeMultiplier={1.2}
          style={[styles.next, { color: colors.muted }]}
          numberOfLines={1}
        >
          {view.next ? `Next: ${view.next}` : 'Last step'}
        </Text>

        <View style={styles.stats}>
          <Stat label="Round" value={view.round ?? '–'} color={fg} />
          <Stat label="Interval" value={view.interval ?? '–'} color={fg} />
          <Stat label="Remaining" value={view.remaining} color={fg} />
        </View>

        <View style={styles.controls}>
          <IconButton
            icon="backward.end.fill"
            color={fg}
            onPress={() => dispatch('skipBack')}
            label="Previous step"
            disabled={isReady}
          />
          <Pressable
            onPress={togglePause}
            style={[styles.primary, { backgroundColor: accent }]}
            accessibilityRole="button"
            accessibilityLabel={isReady ? 'Start' : isPaused ? 'Resume' : 'Pause'}
          >
            <Icon
              name={isReady || isPaused ? 'play.fill' : 'pause.fill'}
              size={36}
              color={colors.background}
            />
          </Pressable>
          <IconButton
            icon="forward.end.fill"
            color={fg}
            onPress={() => dispatch('skipForward')}
            label="Next step"
            disabled={isReady}
          />
        </View>
      </SafeAreaView>
      <StepsSheet
        visible={showSteps}
        timeline={workout.timeline}
        currentIndex={snapshot?.segmentIndex ?? 0}
        onClose={() => setShowSteps(false)}
      />
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text maxFontSizeMultiplier={1.2} style={styles.statLabel}>
        {label}
      </Text>
      <Text maxFontSizeMultiplier={1.2} style={[styles.statValue, { color }]}>
        {value}
      </Text>
    </View>
  );
}

function IconButton(props: {
  icon: 'xmark' | 'backward.end.fill' | 'forward.end.fill';
  color: string;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      hitSlop={12}
      style={[styles.iconButton, props.disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={props.label}
    >
      <Icon name={props.icon} color={props.color} />
    </Pressable>
  );
}

function Summary(props: {
  finished: boolean;
  activeMs: number;
  plannedMs: number;
  name: string;
  onClose: () => void;
}) {
  return (
    <SafeAreaView style={[styles.screen, styles.summary]}>
      <StatusBar style="dark" />
      <Text maxFontSizeMultiplier={1.2} style={styles.summaryTitle}>
        {props.finished ? 'Done' : 'Stopped'}
      </Text>
      <Text maxFontSizeMultiplier={1.2} style={styles.summaryName}>
        {props.name}
      </Text>
      <View style={styles.stats}>
        <Stat label="Active" value={formatClock(props.activeMs)} color={colors.ink} />
        <Stat label="Planned" value={formatClock(props.plannedMs)} color={colors.ink} />
      </View>
      <Pressable
        onPress={props.onClose}
        style={[styles.primaryWide, { backgroundColor: colors.ink }]}
        accessibilityRole="button"
      >
        <Text maxFontSizeMultiplier={1.2} style={styles.primaryWideText}>
          Close
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safe: {
    flex: 1,
    paddingHorizontal: space.l,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  phase: {
    fontFamily: fonts.display,
    fontSize: 22,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  label: {
    fontFamily: fonts.displayHeavy,
    fontSize: 112,
    lineHeight: 120,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  ringArea: {
    alignSelf: 'center',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdown: {
    fontFamily: fonts.displayHeavy,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    fontFamily: fonts.display,
    fontSize: 20,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  next: {
    fontFamily: fonts.display,
    fontSize: 28,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  stats: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.line,
    paddingVertical: space.m,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: space.xs,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  statValue: {
    fontFamily: fonts.displayHeavy,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.xl,
    paddingBottom: space.m,
  },
  iconButton: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.35,
  },
  primary: {
    width: 88,
    height: 88,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summary: {
    backgroundColor: colors.background,
    paddingHorizontal: space.l,
    justifyContent: 'center',
    gap: space.xl,
  },
  summaryTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 120,
    color: colors.ink,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  summaryName: {
    color: colors.muted,
    fontSize: 17,
    textAlign: 'center',
  },
  primaryWide: {
    paddingVertical: space.l,
    borderRadius: 4,
    alignItems: 'center',
  },
  primaryWideText: {
    color: colors.background,
    fontSize: 17,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
