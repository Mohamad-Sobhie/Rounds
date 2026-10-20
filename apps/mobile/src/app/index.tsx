import type { Template } from '@rounds/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { ActionSheetIOS, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { Icon } from '@/components/icon';
import { describeTemplate } from '@/templates/describe';
import { shareTemplates } from '@/templates/share';
import { templatesStore } from '@/templates/templates';
import { colors, fonts, phaseColors, space } from '@/theme';
import { sessionStore } from '@/workout/session';

export default function HomeScreen() {
  const active = useStore(sessionStore, (state) => state.workout);
  const templates = useStore(templatesStore, (state) => state.templates);
  const inProgress = active?.runState != null && active.runState.stoppedAtUtc === undefined;

  useFocusEffect(
    useCallback(() => {
      void templatesStore.getState().refresh();
    }, []),
  );

  const start = (template: Template) => {
    sessionStore.getState().load(template);
    router.push('/workout');
  };

  const showActions = (template: Template, index: number) => {
    const store = templatesStore.getState();
    const actions: { label: string; run: () => void; destructive?: boolean }[] = [
      { label: 'Edit', run: () => router.push(`/template/${template.id}`) },
      { label: 'Duplicate', run: () => void store.duplicate(template.id) },
      { label: 'Share', run: () => void shareTemplates([template]) },
      ...(index > 0 ? [{ label: 'Move up', run: () => void store.move(template.id, -1) }] : []),
      ...(index < templates.length - 1
        ? [{ label: 'Move down', run: () => void store.move(template.id, 1) }]
        : []),
      {
        label: 'Delete',
        destructive: true,
        run: () =>
          Alert.alert(`Delete "${template.name}"?`, "This can't be undone.", [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => void store.remove(template.id) },
          ]),
      },
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: template.name,
        options: [...actions.map((a) => a.label), 'Cancel'],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: actions.findIndex((a) => a.destructive),
      },
      (index) => actions[index]?.run(),
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Text style={styles.title}>Rounds</Text>
        <View style={styles.headerActions}>
          <Pressable
            onPress={() => router.push('/activity')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Activity"
          >
            <Icon name="chart.bar" color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/template/new')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="New template"
          >
            <Icon name="plus" color={colors.ink} />
          </Pressable>
          <Pressable
            onPress={() => router.push('/settings')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Settings"
          >
            <Icon name="gearshape" color={colors.ink} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
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
            <Pressable
              style={styles.row}
              onPress={() => router.push('/quick')}
              accessibilityRole="button"
            >
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Quick start</Text>
                <Text style={styles.rowMeta}>Work, rest, repeat. No template needed.</Text>
              </View>
              <Icon name="bolt.fill" color={phaseColors.work} />
            </Pressable>
            <Text style={styles.section}>Templates</Text>
          </>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>No templates yet. Tap + to build your first workout.</Text>
        }
        renderItem={({ item, index }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/template/${item.id}`)}
            onLongPress={() => showActions(item, index)}
            accessibilityRole="button"
            accessibilityHint="Opens the editor. Long press for more actions."
          >
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>{item.name}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.rowMeta}>{describeTemplate(item)}</Text>
                {item.warmUp && <Icon name="sunrise" size={14} color={colors.muted} />}
                {item.cooldown && <Icon name="sunset" size={14} color={colors.muted} />}
              </View>
            </View>
            <Pressable
              onPress={() => start(item)}
              hitSlop={12}
              style={styles.play}
              accessibilityRole="button"
              accessibilityLabel={`Start ${item.name}`}
            >
              <Icon name="play.fill" color={phaseColors.work} />
            </Pressable>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    marginTop: space.xl,
    marginBottom: space.s,
  },
  headerActions: {
    flexDirection: 'row',
    gap: space.xl,
  },
  title: {
    fontFamily: fonts.displayHeavy,
    fontSize: 56,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  list: {
    paddingHorizontal: space.l,
    paddingBottom: space.xxxl,
  },
  section: {
    marginTop: space.xl,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
  },
  rowMeta: {
    color: colors.muted,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
  },
  play: {
    paddingLeft: space.l,
  },
  empty: {
    marginTop: space.xl,
    color: colors.muted,
    fontSize: 15,
  },
});
