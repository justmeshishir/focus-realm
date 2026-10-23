import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { audioEngine } from '@/audio/audioEngine';
import type { SoundDef } from '@/audio/soundCatalog';
import { useLayer } from '@/audio/useMixer';
import { colors, spacing } from '@/theme';

const STEP = 0.1;

/**
 * Temporary volume UI (±10% steppers). Milestone 3 replaces it with a gesture-driven slider
 * that runs on the UI thread.
 */
function SoundRowImpl({ def }: { def: SoundDef }) {
  // Subscribes to *this layer only*: toggling Rain does not re-render Wind.
  const layer = useLayer(def.id);

  return (
    <View style={[styles.row, layer.enabled && styles.rowActive]}>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: layer.enabled }}
        accessibilityLabel={def.label}
        onPress={() => void audioEngine.toggleLayer(def.id)}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Text style={styles.icon}>{def.icon}</Text>
        <View>
          <Text style={styles.label}>{def.label}</Text>
          <Text style={[styles.status, layer.interrupted && styles.statusWarn]}>
            {layer.interrupted ? 'Interrupted' : layer.playing ? 'Playing' : layer.enabled ? 'Loading…' : 'Off'}
          </Text>
        </View>
      </Pressable>

      <View style={styles.stepper}>
        <Pressable
          accessibilityLabel={`${def.label} quieter`}
          hitSlop={8}
          onPress={() => audioEngine.setLayerVolume(def.id, layer.volume - STEP)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        >
          <Text style={styles.stepText}>−</Text>
        </Pressable>
        <Text style={styles.volume}>{Math.round(layer.volume * 100)}%</Text>
        <Pressable
          accessibilityLabel={`${def.label} louder`}
          hitSlop={8}
          onPress={() => audioEngine.setLayerVolume(def.id, layer.volume + STEP)}
          style={({ pressed }) => [styles.stepBtn, pressed && styles.pressed]}
        >
          <Text style={styles.stepText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export const SoundRow = memo(SoundRowImpl);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  rowActive: { backgroundColor: colors.surfaceActive, borderColor: colors.accent },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexShrink: 1 },
  pressed: { opacity: 0.6 },
  icon: { fontSize: 28 },
  label: { color: colors.text, fontSize: 17, fontWeight: '600' },
  status: { color: colors.textMuted, fontSize: 13, marginTop: 2 },
  statusWarn: { color: colors.warning },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.border,
  },
  stepText: { color: colors.text, fontSize: 20, lineHeight: 22 },
  volume: { color: colors.text, width: 44, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
