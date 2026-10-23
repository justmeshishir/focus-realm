import type { AudioSource } from 'expo-audio';

export type SoundId = 'rain' | 'wind' | 'waves' | 'fire' | 'brown';

export interface SoundDef {
  id: SoundId;
  label: string;
  icon: string;
  // `require()` of a bundled asset resolves to a numeric module id that Metro maps to a file
  // inside the app binary. No network, no filesystem permissions.
  source: AudioSource;
}

export const SOUND_CATALOG: readonly SoundDef[] = [
  { id: 'rain', label: 'Rain', icon: '🌧️', source: require('../../assets/sounds/rain.wav') },
  { id: 'wind', label: 'Wind', icon: '🌬️', source: require('../../assets/sounds/wind.wav') },
  { id: 'waves', label: 'Waves', icon: '🌊', source: require('../../assets/sounds/waves.wav') },
  { id: 'fire', label: 'Fire', icon: '🔥', source: require('../../assets/sounds/fire.wav') },
  { id: 'brown', label: 'Brown noise', icon: '🟤', source: require('../../assets/sounds/brown.wav') },
];

export const SOUND_IDS = SOUND_CATALOG.map((s) => s.id);
