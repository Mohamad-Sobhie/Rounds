import { formatClock } from '@rounds/core';
import { useState } from 'react';
import { StyleSheet, TextInput, type StyleProp, type TextStyle } from 'react-native';

import { parseDuration } from '@/templates/duration';
import { colors } from '@/theme';

interface DurationFieldProps {
  seconds: number;
  onChange: (seconds: number) => void;
  accessibilityLabel: string;
  style?: StyleProp<TextStyle>;
}

/** Edits a duration as "m:ss". Accepts plain seconds too; invalid input reverts on blur. */
export function DurationField({
  seconds,
  onChange,
  accessibilityLabel,
  style,
}: DurationFieldProps) {
  const [text, setText] = useState<string | null>(null);

  const commit = () => {
    if (text === null) return;
    const parsed = parseDuration(text);
    if (parsed !== null && parsed !== seconds) onChange(parsed);
    setText(null);
  };

  return (
    <TextInput
      value={text ?? formatClock(seconds * 1000)}
      onFocus={() => setText(formatClock(seconds * 1000))}
      onChangeText={setText}
      onBlur={commit}
      onSubmitEditing={commit}
      keyboardType="numbers-and-punctuation"
      returnKeyType="done"
      selectTextOnFocus
      accessibilityLabel={accessibilityLabel}
      style={[styles.input, style]}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minWidth: 64,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
    fontSize: 17,
    color: colors.ink,
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
});
