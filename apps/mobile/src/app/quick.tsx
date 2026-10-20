import {
  formatClock,
  quickRoutineToTemplate,
  totalDurationMs,
  type QuickRoutine,
} from '@rounds/core';
import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Icon } from '@/components/icon';
import { Stepper } from '@/components/stepper';
import { newId } from '@/lib/ids';
import { durationStep, quickRoutineName } from '@/quick/naming';
import { quickStore } from '@/quick/quick';
import { templatesStore } from '@/templates/templates';
import { colors, fonts, phaseColors, space } from '@/theme';
import { sessionStore } from '@/workout/session';

type DurationKey = 'warmUpSec' | 'workSec' | 'restSec' | 'recoverySec' | 'cooldownSec';

export default function QuickStartScreen() {
  const { routine, set } = useStore(quickStore);
  const total = formatClock(totalDurationMs(quickRoutineToTemplate(routine, () => 'preview')));

  const toTemplate = () => quickRoutineToTemplate(routine, newId, quickRoutineName(routine));

  const start = () => {
    sessionStore.getState().load(toTemplate());
    router.replace('/workout');
  };

  const saveAsTemplate = async () => {
    const template = toTemplate();
    await templatesStore.getState().save(template);
    Alert.alert('Saved', `"${template.name}" is now in your templates.`);
  };

  const duration = (key: DurationKey, label: string, color: string, min: number) => (
    <Row label={label} color={color}>
      <Stepper
        value={routine[key]}
        min={min}
        max={3600}
        step={durationStep(routine[key])}
        onChange={(value) => set({ [key]: value } as Partial<QuickRoutine>)}
        display={routine[key] === 0 ? 'Off' : formatClock(routine[key] * 1000)}
        accessibilityLabel={label}
      />
    </Row>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Back"
        >
          <Icon name="chevron.left" color={colors.ink} />
        </Pressable>
        <Text style={styles.title}>Quick start</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {duration('warmUpSec', 'Warm-up', phaseColors.warmup, 0)}
        {duration('workSec', 'Work', phaseColors.work, 5)}
        {duration('restSec', 'Rest', phaseColors.rest, 0)}
        <Row label="Repeat">
          <Stepper
            value={routine.repeat}
            max={50}
            onChange={(repeat) => set({ repeat })}
            display={`×${routine.repeat}`}
            accessibilityLabel="Repeat"
          />
        </Row>
        <Row label="Rounds">
          <Stepper
            value={routine.rounds}
            max={20}
            onChange={(rounds) => set({ rounds })}
            display={`×${routine.rounds}`}
            accessibilityLabel="Rounds"
          />
        </Row>
        {routine.rounds > 1 &&
          duration('recoverySec', 'Recovery between rounds', phaseColors.recovery, 0)}
        {duration('cooldownSec', 'Cooldown', phaseColors.cooldown, 0)}
      </ScrollView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.total}>{total}</Text>
        </View>
        <View style={styles.buttons}>
          <Pressable onPress={saveAsTemplate} style={styles.secondary} accessibilityRole="button">
            <Text style={styles.secondaryText}>Save as template</Text>
          </Pressable>
          <Pressable onPress={start} style={styles.primary} accessibilityRole="button">
            <Icon name="play.fill" size={18} color={colors.background} />
            <Text style={styles.primaryText}>Start</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function Row({
  label,
  color,
  children,
}: {
  label: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: color ?? 'transparent' }]} />
      <Text style={styles.rowLabel}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 34,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  content: { paddingHorizontal: space.l, paddingBottom: space.xl },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingVertical: space.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowLabel: { flex: 1, fontSize: 17, color: colors.ink },
  footer: {
    paddingHorizontal: space.l,
    paddingTop: space.m,
    gap: space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
  },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  total: {
    fontFamily: fonts.displayHeavy,
    fontSize: 48,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  buttons: { flexDirection: 'row', gap: space.m, paddingBottom: space.s },
  secondary: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.l,
    borderWidth: 1,
    borderColor: colors.ink,
    borderRadius: 4,
  },
  secondaryText: { fontSize: 17, fontWeight: '600', color: colors.ink },
  primary: {
    flex: 1,
    flexDirection: 'row',
    gap: space.s,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.l,
    backgroundColor: phaseColors.work,
    borderRadius: 4,
  },
  primaryText: { fontSize: 17, fontWeight: '700', color: colors.background },
});
