import { formatClock } from '@rounds/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { activityStore } from '@/activity/activity';
import { formatTotal, type Range, type Summary } from '@/activity/buckets';
import { Icon } from '@/components/icon';
import type { ActivityRecord } from '@/data/activities-repository';
import { activityNames } from '@/templates/describe';
import { colors, fonts, phaseColors, space } from '@/theme';

const ranges: { value: Range; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: '6m', label: '6M' },
  { value: '12m', label: '12M' },
  { value: 'year', label: 'Year' },
];

const dateFormat = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export default function ActivityScreen() {
  const { range, summary, records, setRange, refresh, remove } = useStore(activityStore);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const confirmRemove = (record: ActivityRecord) =>
    Alert.alert(
      'Delete this workout?',
      `${record.templateName}, ${dateFormat.format(record.startedUtc)}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void remove(record.id) },
      ],
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
        <Text style={styles.title}>Activity</Text>
      </View>

      <FlatList
        data={records}
        keyExtractor={(r) => r.id}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <>
            <View style={styles.segmented} accessibilityRole="tablist">
              {ranges.map((r) => {
                const selected = r.value === range;
                return (
                  <Pressable
                    key={r.value}
                    onPress={() => void setRange(r.value)}
                    style={[styles.segment, selected && styles.segmentSelected]}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                  >
                    <Text style={[styles.segmentText, selected && styles.segmentTextSelected]}>
                      {r.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.totals}>
              <Total label="Workouts" value={String(summary?.count ?? 0)} />
              <Total label="Time" value={formatTotal(summary?.activeMs ?? 0)} />
            </View>

            {summary && <Chart summary={summary} />}

            <Text style={styles.section}>Workouts</Text>
          </>
        }
        ListEmptyComponent={<Text style={styles.empty}>No workouts in this period yet.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onLongPress={() => confirmRemove(item)}
            accessibilityHint="Long press to delete"
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.templateName}</Text>
              <Text style={styles.rowMeta}>
                {dateFormat.format(item.startedUtc)} · {activityNames[item.activity]}
              </Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowTime}>{formatClock(item.activeMs)}</Text>
              {item.outcome === 'stopped_early' && (
                <Text style={styles.stopped}>Stopped early</Text>
              )}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function Total({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.total}>
      <Text style={styles.totalLabel}>{label}</Text>
      <Text style={styles.totalValue}>{value}</Text>
    </View>
  );
}

/** Flat bar chart of active minutes per bucket; labels thinned so they never collide. */
function Chart({ summary }: { summary: Summary }) {
  const max = Math.max(...summary.buckets.map((b) => b.activeMs), 1);
  const labelEvery = Math.ceil(summary.buckets.length / 7);
  const description = summary.buckets
    .filter((b) => b.activeMs > 0)
    .map((b) => `${b.label}: ${formatTotal(b.activeMs)}`)
    .join(', ');

  return (
    <View
      style={styles.chart}
      accessible
      accessibilityRole="image"
      accessibilityLabel={
        description ? `Active time per period. ${description}` : 'No activity in this period'
      }
    >
      <View style={styles.bars}>
        {summary.buckets.map((b) => (
          <View key={b.startUtc} style={styles.barSlot}>
            <View
              style={[
                styles.bar,
                { height: `${(b.activeMs / max) * 100}%` },
                b.activeMs === 0 && styles.barEmpty,
              ]}
            />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {summary.buckets.map((b, i) => (
          <Text key={b.startUtc} style={styles.barLabel} numberOfLines={1}>
            {(summary.buckets.length - 1 - i) % labelEvery === 0 ? b.label : ''}
          </Text>
        ))}
      </View>
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
  content: { paddingHorizontal: space.l, paddingBottom: space.xxxl },
  segmented: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    overflow: 'hidden',
  },
  segment: { flex: 1, paddingVertical: space.s, alignItems: 'center' },
  segmentSelected: { backgroundColor: colors.ink },
  segmentText: { fontSize: 15, color: colors.ink },
  segmentTextSelected: { color: colors.background, fontWeight: '600' },
  totals: { flexDirection: 'row', marginTop: space.xl },
  total: { flex: 1, gap: space.xs },
  totalLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  totalValue: {
    fontFamily: fonts.displayHeavy,
    fontSize: 40,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  chart: { marginTop: space.xl },
  bars: { flexDirection: 'row', alignItems: 'flex-end', height: 140, gap: 2 },
  barSlot: { flex: 1, height: '100%', justifyContent: 'flex-end' },
  bar: { backgroundColor: phaseColors.work, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barEmpty: { height: 2, backgroundColor: colors.line },
  labels: { flexDirection: 'row', gap: 2, marginTop: space.xs },
  barLabel: {
    flex: 1,
    fontSize: 11,
    color: colors.muted,
    textAlign: 'center',
    overflow: 'visible',
  },
  section: {
    marginTop: space.xl,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  empty: { marginTop: space.l, fontSize: 15, color: colors.muted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.m,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { fontSize: 17, fontWeight: '600', color: colors.ink },
  rowMeta: { fontSize: 13, color: colors.muted },
  rowRight: { alignItems: 'flex-end', gap: 2 },
  rowTime: {
    fontFamily: fonts.displayHeavy,
    fontSize: 24,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  stopped: { fontSize: 12, color: phaseColors.work },
});
