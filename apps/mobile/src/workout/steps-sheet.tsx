import { formatClock, type Timeline } from '@rounds/core';
import { useMemo } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { colors, fonts, phaseColors, space } from '@/theme';

import { stepRows, type StepRow } from './steps';

const HEADER_HEIGHT = 44;
const ROW_HEIGHT = 52;

interface StepsSheetProps {
  visible: boolean;
  timeline: Timeline;
  currentIndex: number;
  onClose: () => void;
}

/** The whole workout, grouped by round, with the current step highlighted and scrolled into view. */
export function StepsSheet({ visible, timeline, currentIndex, onClose }: StepsSheetProps) {
  const rows = useMemo(() => stepRows(timeline), [timeline]);
  const layout = useMemo(() => rowLayout(rows), [rows]);
  const currentRow = rows.findIndex(
    (r) => r.type === 'segment' && r.segment.index === currentIndex,
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.sheet}>
        <View style={styles.header}>
          <Text style={styles.title}>Steps</Text>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close steps"
          >
            <Icon name="xmark" color={colors.ink} />
          </Pressable>
        </View>
        <FlatList
          data={rows}
          keyExtractor={(row) => row.key}
          getItemLayout={(_, index) => ({ ...(layout[index] ?? { length: 0, offset: 0 }), index })}
          initialScrollIndex={Math.max(0, currentRow - 2)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            if (item.type === 'header') {
              return <Text style={styles.group}>{item.title}</Text>;
            }
            const { segment } = item;
            const current = segment.index === currentIndex;
            const done = segment.index < currentIndex;
            return (
              <View
                style={[styles.row, current && styles.rowCurrent]}
                accessibilityState={{ selected: current }}
                accessibilityLabel={`${segment.label}, ${formatClock(segment.durationMs)}${current ? ', current step' : ''}`}
              >
                <View style={[styles.marker, { backgroundColor: phaseColors[segment.kind] }]} />
                <Text
                  style={[styles.label, done && styles.done, current && styles.labelCurrent]}
                  numberOfLines={1}
                >
                  {segment.label}
                </Text>
                <Text style={[styles.duration, done && styles.done]}>
                  {formatClock(segment.durationMs)}
                </Text>
              </View>
            );
          }}
        />
      </View>
    </Modal>
  );
}

/** Offsets for `getItemLayout`, so the list can open scrolled to the current step. */
function rowLayout(rows: readonly StepRow[]): { length: number; offset: number }[] {
  const result: { length: number; offset: number }[] = [];
  let offset = 0;
  for (const row of rows) {
    const length = row.type === 'header' ? HEADER_HEIGHT : ROW_HEIGHT;
    result.push({ length, offset });
    offset += length;
  }
  return result;
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    paddingVertical: space.l,
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 34,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  list: { paddingHorizontal: space.l, paddingBottom: space.xxxl },
  group: {
    height: HEADER_HEIGHT,
    paddingTop: space.l,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  row: {
    height: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.s,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  rowCurrent: { backgroundColor: colors.surface },
  marker: { width: 4, height: 28, borderRadius: 2 },
  label: { flex: 1, fontSize: 17, color: colors.ink },
  labelCurrent: { fontWeight: '700' },
  duration: { fontSize: 17, color: colors.ink, fontVariant: ['tabular-nums'] },
  done: { color: colors.muted },
});
