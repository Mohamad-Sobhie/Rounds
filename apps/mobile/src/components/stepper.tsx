import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, space } from '@/theme';

import { Icon } from './icon';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Text shown between the buttons; defaults to the value. */
  display?: string;
  accessibilityLabel: string;
}

/** − value + control for counts and coarse durations. */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  display,
  accessibilityLabel,
}: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <View
      style={styles.row}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: display ?? String(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(event) =>
        set(value + (event.nativeEvent.actionName === 'increment' ? step : -step))
      }
    >
      <Pressable
        onPress={() => set(value - step)}
        disabled={value <= min}
        hitSlop={8}
        style={styles.button}
      >
        <Icon name="minus" size={18} color={value <= min ? colors.line : colors.ink} />
      </Pressable>
      <Text style={styles.value}>{display ?? value}</Text>
      <Pressable
        onPress={() => set(value + step)}
        disabled={value >= max}
        hitSlop={8}
        style={styles.button}
      >
        <Icon name="plus" size={18} color={value >= max ? colors.line : colors.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 4,
  },
  button: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    minWidth: 48,
    textAlign: 'center',
    fontSize: 17,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    paddingHorizontal: space.xs,
  },
});
