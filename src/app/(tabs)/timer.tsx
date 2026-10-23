import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/theme';

// Placeholder — built in Milestone 5.
export default function TimerScreen() {
  return (
    <View style={styles.center}>
      <Text style={styles.text}>Focus timer — Milestone 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: colors.textMuted },
});
