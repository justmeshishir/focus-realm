import { useSyncExternalStore } from 'react';

import { audioEngine, type LayerState, type MixerState } from './audioEngine';
import type { SoundId } from './soundCatalog';

/**
 * Subscribe to a slice of engine state. The selector must return a referentially-stable value for
 * unchanged data (primitives, or objects from the engine's structurally-shared state) or React
 * will loop / over-render.
 */
export function useMixerSelector<T>(selector: (state: MixerState) => T): T {
  return useSyncExternalStore(audioEngine.subscribe, () => selector(audioEngine.getSnapshot()));
}

export const useLayer = (id: SoundId): LayerState => useMixerSelector((s) => s.layers[id]);
export const useMasterVolume = (): number => useMixerSelector((s) => s.master);
export const useAnyInterrupted = (): boolean =>
  useMixerSelector((s) => Object.values(s.layers).some((l) => l.interrupted));
export const useActiveCount = (): number =>
  useMixerSelector((s) => Object.values(s.layers).filter((l) => l.enabled).length);
