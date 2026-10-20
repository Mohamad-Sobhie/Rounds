import { formatClock } from '@rounds/core';
import { useKeepAwake } from 'expo-keep-awake';
import { Redirect, router, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Alert, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Icon } from '@/components/icon';
import { colors, fonts, phaseColors, space } from '@/theme';
import { ProgressRings } from '@/workout/progress-rings';
import { clock, sessionStore } from '@/workout/session';
import { useSnapshot } from '@/workout/use-snapshot';
import { workoutView } from '@/workout/view-model';

export default function WorkoutScreen() {
  useKeepAwake();
  const workout = useStore(sessionStore, (state) => state.workout);
  const dispatch = useStore(sessionStore, (state) => state.dispatch);
  const snapshot = useSnapshot(sessionStore, clock);
  const { width, height } = useWindowDimensions();

  if (!workout) return <Redirect href="/" />;

  const view = workoutView(workout.timeline, snapshot);
  const phase = phaseColors[view.phase];
  const fg = phase.foreground;
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
    Alert.alert('End workout?', 'Your progress so far will be saved.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'End', style: 'destructive', onPress: () => dispatch('stop') },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: phase.background }]}>
      <Stack.Screen options={{ gestureEnabled: false, animation: 'fade' }} />
      <StatusBar style={fg === colors.ink ? 'dark' : 'light'} />
      <SafeAreaView style={styles.safe}>
        <View style={styles.topBar}>
          <IconButton icon="xmark" color={fg} onPress={confirmEnd} label="End workout" />
          <Text style={[styles.phase, { color: fg }]}>{isPaused ? 'Paused' : view.phase}</Text>
          <View style={styles.iconButton} />
        </View>

        <Text
          style={[styles.label, { color: fg }]}
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
            color={fg}
            trackColor={phase.track}
          />
          <View style={[StyleSheet.absoluteFill, styles.ringCenter]}>
            <Text
              style={[
                styles.countdown,
                { color: fg, fontSize: ringSize * 0.34, opacity: isPaused ? 0.5 : 1 },
              ]}
            >
              {view.countdown}
            </Text>
            {isReady && <Text style={[styles.hint, { color: fg }]}>Tap to start</Text>}
          </View>
        </Pressable>

        <Text style={[styles.next, { color: fg }]} numberOfLines={1}>
          {view.next ? `Next: ${view.next}` : 'Last step'}
        </Text>

        <View style={[styles.stats, { borderColor: phase.track }]}>
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
            style={[styles.primary, { borderColor: fg }]}
            accessibilityRole="button"
            accessibilityLabel={isReady ? 'Start' : isPaused ? 'Resume' : 'Pause'}
          >
            <Icon name={isReady || isPaused ? 'play.fill' : 'pause.fill'} size={36} color={fg} />
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
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color }]}>{label}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
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
      <StatusBar style="light" />
      <Text style={styles.summaryTitle}>{props.finished ? 'Done' : 'Stopped'}</Text>
      <Text style={styles.summaryName}>{props.name}</Text>
      <View style={[styles.stats, { borderColor: colors.line }]}>
        <Stat label="Active" value={formatClock(props.activeMs)} color={colors.paper} />
        <Stat label="Planned" value={formatClock(props.plannedMs)} color={colors.paper} />
      </View>
      <Pressable
        onPress={props.onClose}
        style={[styles.primaryWide, { backgroundColor: colors.accent }]}
        accessibilityRole="button"
      >
        <Text style={styles.primaryWideText}>Close</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
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
    borderTopWidth: 2,
    borderBottomWidth: 2,
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
    opacity: 0.75,
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
    borderWidth: 3,
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
    color: colors.paper,
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
    color: colors.ink,
    fontSize: 17,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});
