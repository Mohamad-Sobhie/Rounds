import type { CueSettings } from '@rounds/core';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Icon } from '@/components/icon';
import { settingsStore } from '@/settings/settings';
import { colors, fonts, phaseColors, space } from '@/theme';

const cueRows: { key: keyof CueSettings; label: string; detail: string }[] = [
  {
    key: 'beeps',
    label: 'Countdown beeps',
    detail: 'Last 3 seconds of every step, and a chime on each change',
  },
  { key: 'speech', label: 'Spoken cues', detail: 'Announces each step, e.g. "Level 8, 1 minute"' },
  { key: 'announceRest', label: 'Announce rests', detail: 'Also speak rest steps' },
  {
    key: 'announceHalfway',
    label: 'Halfway',
    detail: 'Say "Halfway" at the middle of the workout',
  },
  { key: 'announceLastRound', label: 'Last round', detail: 'Say "Last round" when it starts' },
];

const volumes = [0.25, 0.5, 0.75, 1];

export default function SettingsScreen() {
  const settings = useStore(settingsStore);

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
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.section}>Cues</Text>
        {cueRows.map((row) => {
          const dependsOnSpeech = row.key !== 'beeps' && row.key !== 'speech';
          const disabled = dependsOnSpeech && !settings.cues.speech;
          return (
            <ToggleRow
              key={row.key}
              label={row.label}
              detail={row.detail}
              value={settings.cues[row.key]}
              disabled={disabled}
              onChange={(value) => settings.updateCues({ [row.key]: value })}
            />
          );
        })}

        <Text style={styles.section}>Cue volume</Text>
        <View style={styles.segmented} accessibilityRole="radiogroup">
          {volumes.map((volume) => {
            const selected = settings.volume === volume;
            return (
              <Pressable
                key={volume}
                onPress={() => settings.update({ volume })}
                style={[styles.segment, selected && styles.segmentSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                  {volume * 100}%
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.hint}>
          Relative to your phone volume. Music keeps playing underneath.
        </Text>

        <Text style={styles.section}>Feedback</Text>
        <ToggleRow
          label="Vibration"
          detail="Vibrate on each step change while the app is open. iOS doesn't allow vibration while the screen is locked."
          value={settings.vibration}
          onChange={(vibration) => settings.update({ vibration })}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow(props: {
  label: string;
  detail: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={[styles.row, props.disabled && styles.disabled]}>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{props.label}</Text>
        <Text style={styles.rowDetail}>{props.detail}</Text>
      </View>
      <Switch
        value={props.value}
        disabled={props.disabled}
        onValueChange={props.onChange}
        trackColor={{ true: phaseColors.work, false: colors.line }}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  content: {
    paddingHorizontal: space.l,
    paddingBottom: space.xxxl,
  },
  section: {
    marginTop: space.xl,
    marginBottom: space.s,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingVertical: space.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  disabled: {
    opacity: 0.4,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 17,
    color: colors.ink,
  },
  rowDetail: {
    fontSize: 13,
    color: colors.muted,
  },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    paddingVertical: space.m,
    alignItems: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.ink,
  },
  segmentText: {
    fontSize: 15,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  segmentTextSelected: {
    color: colors.background,
    fontWeight: '600',
  },
  hint: {
    marginTop: space.s,
    fontSize: 13,
    color: colors.muted,
  },
});
