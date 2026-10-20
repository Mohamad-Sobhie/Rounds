import {
  activityTypes,
  formatClock,
  totalDurationMs,
  validateTemplate,
  type Template,
  type TimedSegment,
} from '@rounds/core';
import { router, useLocalSearchParams, usePreventRemove } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActionSheetIOS,
  Alert,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from 'zustand';

import { DurationField } from '@/components/duration-field';
import { Icon } from '@/components/icon';
import { Stepper } from '@/components/stepper';
import { newId } from '@/lib/ids';
import { activityNames } from '@/templates/describe';
import * as edit from '@/templates/draft';
import { templatesStore } from '@/templates/templates';
import { colors, fonts, phaseColors, space } from '@/theme';
import { sessionStore } from '@/workout/session';

export default function TemplateEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const saved = useStore(templatesStore, (s) => s.templates.find((t) => t.id === id));
  const [created] = useState(() => (id === 'new' ? edit.newTemplate(newId) : null));
  const initial = created ?? saved;

  if (!initial) {
    return (
      <SafeAreaView style={styles.screen}>
        <Text style={styles.missing}>This template no longer exists.</Text>
      </SafeAreaView>
    );
  }
  return <Editor initial={initial} isNew={created !== null} />;
}

function Editor({ initial, isNew }: { initial: Template; isNew: boolean }) {
  const [draft, setDraft] = useState(initial);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  const dirty = JSON.stringify(draft) !== baseline;

  const validation = useMemo(() => validateTemplate(draft), [draft]);
  const total = validation.ok ? formatClock(totalDurationMs(validation.template)) : '–';

  const allowLeaving = usePreventRemove(dirty, ({ repeat }) => {
    Alert.alert('Discard changes?', 'Your edits to this template will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: repeat },
    ]);
  });

  const update = (fn: (t: Template) => Template) => setDraft(fn);

  const save = async (): Promise<boolean> => {
    if (!validation.ok) {
      Alert.alert('Fix the template first', validation.issues[0]?.message);
      return false;
    }
    await templatesStore.getState().save(validation.template);
    setBaseline(JSON.stringify(draft));
    allowLeaving();
    return true;
  };

  const saveAndStart = async () => {
    if (!(await save())) return;
    sessionStore.getState().load(draft);
    router.replace('/workout');
  };

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
        <Text style={styles.headerTitle}>{isNew ? 'New template' : 'Edit template'}</Text>
        <Pressable
          onPress={async () => {
            if (await save()) router.back();
          }}
          hitSlop={12}
          accessibilityRole="button"
        >
          <Text style={[styles.headerAction, !dirty && !isNew && styles.headerActionIdle]}>
            Save
          </Text>
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior="padding" style={styles.flex}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TextInput
            value={draft.name}
            onChangeText={(name) => update((t) => ({ ...t, name }))}
            placeholder="Workout name"
            placeholderTextColor={colors.muted}
            style={styles.name}
            accessibilityLabel="Workout name"
          />

          <View style={styles.chips}>
            {activityTypes.map((activity) => {
              const selected = draft.activity === activity;
              return (
                <Pressable
                  key={activity}
                  onPress={() => update((t) => ({ ...t, activity }))}
                  style={[styles.chip, selected && styles.chipSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {activityNames[activity]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <SegmentSection
            title="Warm-up"
            color={phaseColors.warmup}
            segment={draft.warmUp}
            fallbackLabel="Warm-up"
            onChange={(warmUp) => update((t) => withOptional(t, 'warmUp', warmUp))}
          />

          {draft.rounds.map((round, r) => (
            <View key={round.id} style={styles.round}>
              <View style={styles.roundHeader}>
                <Text style={styles.roundTitle}>Round {r + 1}</Text>
                <Pressable
                  onPress={() =>
                    showMenu(`Round ${r + 1}`, [
                      {
                        label: 'Duplicate round',
                        run: () => update((t) => edit.copyRound(t, r, newId)),
                      },
                      ...(r > 0
                        ? [{ label: 'Move up', run: () => update((t) => edit.moveRound(t, r, -1)) }]
                        : []),
                      ...(r < draft.rounds.length - 1
                        ? [
                            {
                              label: 'Move down',
                              run: () => update((t) => edit.moveRound(t, r, 1)),
                            },
                          ]
                        : []),
                      ...(draft.rounds.length > 1
                        ? [
                            {
                              label: 'Delete round',
                              destructive: true,
                              run: () => update((t) => edit.removeRound(t, r)),
                            },
                          ]
                        : []),
                    ])
                  }
                  hitSlop={12}
                  accessibilityRole="button"
                  accessibilityLabel={`Round ${r + 1} actions`}
                >
                  <Icon name="ellipsis.circle" color={colors.ink} />
                </Pressable>
              </View>

              {round.blocks.map((block, b) => {
                const path = { round: r, block: b };
                const hasRest = block.steps.some((s) => s.kind === 'rest');
                return (
                  <View key={block.id} style={styles.block}>
                    <View style={styles.blockHeader}>
                      <Text style={styles.blockLabel}>Repeat</Text>
                      <Stepper
                        value={block.repeat}
                        onChange={(repeat) => update((t) => edit.updateBlock(t, path, { repeat }))}
                        display={`×${block.repeat}`}
                        accessibilityLabel="Repeat count"
                      />
                      <View style={styles.flex} />
                      <Pressable
                        onPress={() =>
                          showMenu('Block', [
                            {
                              label: 'Add another block',
                              run: () => update((t) => edit.addBlock(t, r, newId)),
                            },
                            ...(b > 0
                              ? [
                                  {
                                    label: 'Move up',
                                    run: () => update((t) => edit.moveBlock(t, path, -1)),
                                  },
                                ]
                              : []),
                            ...(b < round.blocks.length - 1
                              ? [
                                  {
                                    label: 'Move down',
                                    run: () => update((t) => edit.moveBlock(t, path, 1)),
                                  },
                                ]
                              : []),
                            ...(round.blocks.length > 1
                              ? [
                                  {
                                    label: 'Delete block',
                                    destructive: true,
                                    run: () => update((t) => edit.removeBlock(t, path)),
                                  },
                                ]
                              : []),
                          ])
                        }
                        hitSlop={12}
                        accessibilityRole="button"
                        accessibilityLabel="Block actions"
                      >
                        <Icon name="ellipsis" color={colors.muted} />
                      </Pressable>
                    </View>

                    {block.steps.map((step, s) => {
                      const stepPath = { ...path, step: s };
                      return (
                        <View key={step.id} style={styles.step}>
                          <Pressable
                            onPress={() =>
                              update((t) =>
                                edit.updateStep(t, stepPath, {
                                  kind: step.kind === 'work' ? 'rest' : 'work',
                                }),
                              )
                            }
                            style={[styles.kind, { backgroundColor: phaseColors[step.kind] }]}
                            accessibilityRole="button"
                            accessibilityLabel={`${step.kind === 'work' ? 'Work' : 'Rest'} step. Tap to switch.`}
                          >
                            <Text style={styles.kindText}>{step.kind === 'work' ? 'W' : 'R'}</Text>
                          </Pressable>
                          <TextInput
                            value={step.label}
                            onChangeText={(label) =>
                              update((t) => edit.updateStep(t, stepPath, { label }))
                            }
                            placeholder="Label, e.g. Level 8"
                            placeholderTextColor={colors.muted}
                            style={styles.stepLabel}
                            accessibilityLabel="Step label"
                          />
                          <DurationField
                            seconds={step.durationSec}
                            onChange={(durationSec) =>
                              update((t) => edit.updateStep(t, stepPath, { durationSec }))
                            }
                            accessibilityLabel={`${step.label} duration`}
                          />
                          <Pressable
                            onPress={() =>
                              showMenu(step.label || 'Step', [
                                ...(s > 0
                                  ? [
                                      {
                                        label: 'Move up',
                                        run: () => update((t) => edit.moveStep(t, stepPath, -1)),
                                      },
                                    ]
                                  : []),
                                ...(s < block.steps.length - 1
                                  ? [
                                      {
                                        label: 'Move down',
                                        run: () => update((t) => edit.moveStep(t, stepPath, 1)),
                                      },
                                    ]
                                  : []),
                                ...(block.steps.length > 1
                                  ? [
                                      {
                                        label: 'Delete step',
                                        destructive: true,
                                        run: () => update((t) => edit.removeStep(t, stepPath)),
                                      },
                                    ]
                                  : []),
                              ])
                            }
                            hitSlop={8}
                            accessibilityRole="button"
                            accessibilityLabel="Step actions"
                          >
                            <Icon name="ellipsis" size={20} color={colors.muted} />
                          </Pressable>
                        </View>
                      );
                    })}

                    <View style={styles.addRow}>
                      <AddButton
                        label="Work"
                        onPress={() => update((t) => edit.addStep(t, path, 'work', newId))}
                      />
                      <AddButton
                        label="Rest"
                        onPress={() => update((t) => edit.addStep(t, path, 'rest', newId))}
                      />
                    </View>

                    {hasRest && block.repeat > 1 && (
                      <View style={styles.override}>
                        <Text style={styles.overrideLabel}>Different last rest</Text>
                        {block.lastRepeatRestOverrideSec !== undefined && (
                          <DurationField
                            seconds={Math.max(1, block.lastRepeatRestOverrideSec)}
                            onChange={(sec) =>
                              update((t) =>
                                edit.updateBlock(t, path, { lastRepeatRestOverrideSec: sec }),
                              )
                            }
                            accessibilityLabel="Last rest duration"
                          />
                        )}
                        <Switch
                          value={block.lastRepeatRestOverrideSec !== undefined}
                          onValueChange={(on) =>
                            update((t) =>
                              edit.updateBlock(t, path, {
                                lastRepeatRestOverrideSec: on ? 60 : undefined,
                              }),
                            )
                          }
                          trackColor={{ true: phaseColors.work, false: colors.line }}
                          accessibilityLabel="Different last rest"
                        />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))}

          <View style={styles.addRow}>
            <AddButton label="Round" onPress={() => update((t) => edit.addRound(t, newId))} />
          </View>

          {draft.rounds.length > 1 && (
            <View style={styles.sectionRow}>
              <View style={[styles.dot, { backgroundColor: phaseColors.recovery }]} />
              <Text style={styles.sectionTitle}>Recovery between rounds</Text>
              {draft.recoverySec !== undefined && (
                <DurationField
                  seconds={draft.recoverySec}
                  onChange={(recoverySec) => update((t) => ({ ...t, recoverySec }))}
                  accessibilityLabel="Recovery duration"
                />
              )}
              <Switch
                value={draft.recoverySec !== undefined}
                onValueChange={(on) =>
                  update((t) => withOptional(t, 'recoverySec', on ? 120 : undefined))
                }
                trackColor={{ true: phaseColors.work, false: colors.line }}
                accessibilityLabel="Recovery between rounds"
              />
            </View>
          )}

          <SegmentSection
            title="Cooldown"
            color={phaseColors.cooldown}
            segment={draft.cooldown}
            fallbackLabel="Cooldown"
            onChange={(cooldown) => update((t) => withOptional(t, 'cooldown', cooldown))}
          />

          {!validation.ok && <Text style={styles.error}>{validation.issues[0]?.message}</Text>}
        </ScrollView>
      </KeyboardAvoidingView>

      <SafeAreaView edges={['bottom']} style={styles.footer}>
        <View>
          <Text style={styles.footerLabel}>Total</Text>
          <Text style={styles.footerTotal}>{total}</Text>
        </View>
        <Pressable onPress={saveAndStart} style={styles.start} accessibilityRole="button">
          <Icon name="play.fill" size={18} color={colors.background} />
          <Text style={styles.startText}>Save and start</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaView>
  );
}

function SegmentSection(props: {
  title: string;
  color: string;
  segment: TimedSegment | undefined;
  fallbackLabel: string;
  onChange: (segment: TimedSegment | undefined) => void;
}) {
  const { segment } = props;
  return (
    <View>
      <View style={styles.sectionRow}>
        <View style={[styles.dot, { backgroundColor: props.color }]} />
        <Text style={styles.sectionTitle}>{props.title}</Text>
        {segment && (
          <DurationField
            seconds={segment.durationSec}
            onChange={(durationSec) => props.onChange({ ...segment, durationSec })}
            accessibilityLabel={`${props.title} duration`}
          />
        )}
        <Switch
          value={segment !== undefined}
          onValueChange={(on) => props.onChange(on ? { durationSec: 300 } : undefined)}
          trackColor={{ true: phaseColors.work, false: colors.line }}
          accessibilityLabel={props.title}
        />
      </View>
      {segment && (
        <TextInput
          value={segment.label ?? ''}
          onChangeText={(label) => {
            const { label: _, ...rest } = segment;
            props.onChange(label.trim() ? { ...rest, label } : rest);
          }}
          placeholder={`Label (default "${props.fallbackLabel}")`}
          placeholderTextColor={colors.muted}
          style={styles.segmentLabel}
          accessibilityLabel={`${props.title} label`}
        />
      )}
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={styles.add}
      accessibilityRole="button"
      accessibilityLabel={`Add ${label.toLowerCase()}`}
    >
      <Icon name="plus" size={14} color={colors.ink} />
      <Text style={styles.addText}>{label}</Text>
    </Pressable>
  );
}

function showMenu(
  title: string,
  actions: { label: string; run: () => void; destructive?: boolean }[],
) {
  if (actions.length === 0) return;
  ActionSheetIOS.showActionSheetWithOptions(
    {
      title,
      options: [...actions.map((a) => a.label), 'Cancel'],
      cancelButtonIndex: actions.length,
      destructiveButtonIndex: actions.findIndex((a) => a.destructive),
    },
    (index) => actions[index]?.run(),
  );
}

/** Sets or removes an optional template field (absent, not undefined, keeps the JSON clean). */
function withOptional<K extends 'warmUp' | 'cooldown' | 'recoverySec'>(
  t: Template,
  key: K,
  value: Template[K] | undefined,
): Template {
  const { [key]: _, ...rest } = t;
  return (value === undefined ? rest : { ...rest, [key]: value }) as unknown as Template;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  missing: { margin: space.xl, color: colors.muted, fontSize: 17 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.m,
    paddingHorizontal: space.l,
    paddingVertical: space.m,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.displayHeavy,
    fontSize: 28,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  headerAction: { fontSize: 17, fontWeight: '600', color: phaseColors.work },
  headerActionIdle: { color: colors.muted },
  content: { paddingHorizontal: space.l, paddingBottom: space.xxxl, gap: space.l },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.ink,
    paddingVertical: space.s,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.s },
  chip: {
    paddingVertical: space.s,
    paddingHorizontal: space.m,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
  },
  chipSelected: { backgroundColor: colors.ink, borderColor: colors.ink },
  chipText: { fontSize: 15, color: colors.ink },
  chipTextSelected: { color: colors.background, fontWeight: '600' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: space.m, minHeight: 44 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  sectionTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: colors.ink },
  segmentLabel: {
    marginTop: space.s,
    marginLeft: 22,
    paddingVertical: space.s,
    fontSize: 15,
    color: colors.ink,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  round: { borderTopWidth: 2, borderTopColor: colors.ink, paddingTop: space.m, gap: space.m },
  roundHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roundTitle: {
    fontFamily: fonts.displayHeavy,
    fontSize: 26,
    color: colors.ink,
    textTransform: 'uppercase',
  },
  block: { backgroundColor: colors.surface, padding: space.m, gap: space.s, borderRadius: 4 },
  blockHeader: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  blockLabel: { fontSize: 15, color: colors.muted },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.s },
  kind: { width: 32, height: 32, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  kindText: { color: colors.background, fontWeight: '700', fontSize: 15 },
  stepLabel: {
    flex: 1,
    fontSize: 17,
    color: colors.ink,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.line,
  },
  addRow: { flexDirection: 'row', gap: space.s },
  add: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingVertical: space.s,
    paddingHorizontal: space.m,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    backgroundColor: colors.background,
  },
  addText: { fontSize: 15, color: colors.ink },
  override: { flexDirection: 'row', alignItems: 'center', gap: space.m },
  overrideLabel: { flex: 1, fontSize: 15, color: colors.muted },
  error: { color: phaseColors.work, fontSize: 15 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.l,
    paddingTop: space.m,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    backgroundColor: colors.background,
  },
  footerLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: colors.muted,
  },
  footerTotal: {
    fontFamily: fonts.displayHeavy,
    fontSize: 34,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  start: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.s,
    paddingVertical: space.m,
    paddingHorizontal: space.l,
    backgroundColor: colors.ink,
    borderRadius: 4,
  },
  startText: { color: colors.background, fontSize: 17, fontWeight: '700' },
});
