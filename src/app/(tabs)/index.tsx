import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { audioEngine } from '@/audio/audioEngine';
import { SOUND_CATALOG } from '@/audio/soundCatalog';
import { useActiveCount, useAnyInterrupted, useMasterVolume } from '@/audio/useMixer';
import { SoundRow } from '@/components/SoundRow';
import { colors, spacing } from '@/theme';

export default function MixerScreen() {
  const master = useMasterVolume();
  const activeCount = useActiveCount();
  const anyInterrupted = useAnyInterrupted();

  return (
    <ScrollView contentContainerStyle={styles.content}>
      {anyInterrupted && (
        <Pressable style={styles.banner} onPress={() => void audioEngine.resumeInterrupted()}>
          <Text style={styles.bannerText}>Audio was interrupted — tap to resume</Text>
        </Pressable>
      )}

      <View style={styles.master}>
        <Text style={styles.masterLabel}>Master {Math.round(master * 100)}%</Text>
        <View style={styles.masterButtons}>
          <Pressable style={styles.chip} onPress={() => audioEngine.setMasterVolume(master - 0.1)}>
            <Text style={styles.chipText}>−</Text>
          </Pressable>
          <Pressable style={styles.chip} onPress={() => audioEngine.setMasterVolume(master + 0.1)}>
            <Text style={styles.chipText}>+</Text>
          </Pressable>
          <Pressable
            style={[styles.chip, activeCount === 0 && styles.chipDisabled]}
            disabled={activeCount === 0}
            onPress={() => audioEngine.stopAll()}
          >
            <Text style={styles.chipText}>Stop all</Text>
          </Pressable>
        </View>
      </View>

      {SOUND_CATALOG.map((def) => (
        <SoundRow key={def.id} def={def} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.md, gap: spacing.sm },
  banner: { backgroundColor: colors.warning, borderRadius: 12, padding: spacing.md },
  bannerText: { color: colors.bg, fontWeight: '700', textAlign: 'center' },
  master: { gap: spacing.sm, paddingVertical: spacing.sm },
  masterLabel: { color: colors.textMuted, fontSize: 13, textTransform: 'uppercase', letterSpacing: 1 },
  masterButtons: { flexDirection: 'row', gap: spacing.sm },
  chip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipDisabled: { opacity: 0.4 },
  chipText: { color: colors.text, fontWeight: '600' },
});
