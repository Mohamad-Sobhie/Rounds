import { formatClock } from '@rounds/core';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.clock}>{formatClock(90_000)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clock: {
    fontSize: 64,
    fontVariant: ['tabular-nums'],
  },
});
