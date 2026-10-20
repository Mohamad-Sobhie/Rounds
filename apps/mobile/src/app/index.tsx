import { formatClock, totalDurationMs, type Template } from '@rounds/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Icon } from '@/components/icon';
import { colors, fonts, phaseColors, space } from '@/theme';
import { presets } from '@/workout/presets';
import { sessionStore } from '@/workout/session';

export default function HomeScreen() {
  const active = useStore(sessionStore, (state) => state.workout);
  const inProgress = active?.runState != null && active.runState.stoppedAtUtc === undefined;

  const start = (template: Template) => {
    sessionStore.getState().load(template);
    router.push('/workout');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Rounds</Text>
        <Pressable
          onPress={() => router.push('/settings')}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Icon name="gearshape" color={colors.ink} />
        </Pressable>
      </View>

      {inProgress && (
        <Pressable
          style={[styles.row, styles.resume]}
          onPress={() => router.push('/workout')}
          accessibilityRole="button"
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Resume {active.templateName}</Text>
            <Text style={styles.rowMeta}>Workout in progress</Text>
          </View>
          <Icon name="play.fill" color={colors.ink} />
        </Pressable>
      )}

      {presets.map(({ title, template }) => (
        <Pressable
          key={template.id}
          style={styles.row}
          onPress={() => start(template)}
          accessibilityRole="button"
          accessibilityLabel={`Start ${title}`}
        >
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>{title}</Text>
            <Text style={styles.rowMeta}>{formatClock(totalDurationMs(template))}</Text>
          </View>
          <Icon name="play.fill" color={phaseColors.work} />
        </Pressable>
      ))}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: space.l,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.l,
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 56,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.l,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  resume: {
    borderBottomColor: colors.ink,
  },
  rowText: {
    flex: 1,
    gap: space.xs,
  },
  rowTitle: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '600',
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
});
