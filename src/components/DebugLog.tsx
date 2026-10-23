import { StyleSheet, Text, View } from 'react-native';

import { useEngineLog } from '@/audio/useMixer';
import { colors, spacing } from '@/theme';

/** Dev-only view of what the native audio layer is reporting. Screenshot-friendly. */
export function DebugLog() {
  const log = useEngineLog();
  if (!__DEV__) return null;

  return (
    <View style={styles.box}>
      <Text style={styles.title}>Audio debug (dev only)</Text>
      {log.length === 0 ? (
        <Text style={styles.line}>no events yet</Text>
      ) : (
        log.map((line, i) => (
          <Text key={i} style={styles.line}>
            {line}
          </Text>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginTop: spacing.md, padding: spacing.sm, borderRadius: 8, backgroundColor: '#000', gap: 2 },
  title: { color: colors.textMuted, fontSize: 11, textTransform: 'uppercase', marginBottom: spacing.xs },
  line: { color: '#9EF0B4', fontSize: 10, fontFamily: 'Menlo' },
});
