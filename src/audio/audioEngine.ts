import { AppState, type AppStateStatus, type NativeEventSubscription } from 'react-native';
import {
  createAudioPlayer,
  setIsAudioActiveAsync,
  type AudioPlayer,
  type AudioStatus,
} from 'expo-audio';

import { configureAudioSession } from './audioSession';
import { SOUND_CATALOG, SOUND_IDS, type SoundId } from './soundCatalog';

/**
 * Per-layer state as the UI sees it. Note the deliberate split between
 *   - intent  (`enabled`, `volume`): what the *user* asked for. Only we mutate it.
 *   - reality (`playing`, `loaded`):  what the *native player* reports. The OS can change it
 *                                     behind our back (phone call, Siri, headphones unplugged).
 * Everything interesting about robust audio is reconciling the two.
 */
export interface LayerState {
  id: SoundId;
  enabled: boolean;
  volume: number; // 0..1, before master scaling
  loaded: boolean;
  playing: boolean;
  /** Derived: the user wants this audible, the player is ready, yet it is silent. */
  interrupted: boolean;
}

export interface MixerState {
  master: number; // 0..1
  layers: Record<SoundId, LayerState>;
}

const DEFAULT_LAYER_VOLUME = 0.5;
const DEFAULT_MASTER = 0.8;
/** After we issue play(), native status briefly reports `playing: false`. Don't call that an interruption. */
const INTERRUPT_GRACE_MS = 1000;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

function createInitialState(): MixerState {
  const layers = {} as Record<SoundId, LayerState>;
  for (const id of SOUND_IDS) {
    layers[id] = {
      id,
      enabled: false,
      volume: DEFAULT_LAYER_VOLUME,
      loaded: false,
      playing: false,
      interrupted: false,
    };
  }
  return { master: DEFAULT_MASTER, layers };
}

/**
 * Owns every native AudioPlayer. Lives *outside* React on purpose:
 *  - audio must keep running regardless of which screen is mounted;
 *  - native handles are not something you want tied to component lifecycles.
 * React reads it through `useSyncExternalStore` (see useMixer.ts).
 *
 * The state object is immutable and structurally shared: changing one layer replaces only that
 * layer object, so per-layer selectors keep referential equality and untouched rows don't re-render.
 */
export class AudioEngine {
  private state: MixerState = createInitialState();
  private listeners = new Set<() => void>();
  private players = new Map<SoundId, AudioPlayer>();
  private statusSubs = new Map<SoundId, { remove(): void }>();
  private lastCommandAt = new Map<SoundId, number>();
  private appStateSub: NativeEventSubscription | null = null;
  private initPromise: Promise<void> | null = null;

  // ---- store contract (arrow fns so they can be passed to useSyncExternalStore unbound) ----

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): MixerState => this.state;

  // ---- lifecycle ----

  /** Idempotent. Safe to call from a StrictMode-double-invoked effect. */
  init(): Promise<void> {
    this.initPromise ??= (async () => {
      await configureAudioSession();
      this.appStateSub = AppState.addEventListener('change', this.onAppStateChange);
    })();
    return this.initPromise;
  }

  /** Releases native resources. JS garbage collection does NOT free native players for you. */
  dispose(): void {
    this.appStateSub?.remove();
    this.appStateSub = null;
    for (const sub of this.statusSubs.values()) sub.remove();
    this.statusSubs.clear();
    for (const player of this.players.values()) player.remove();
    this.players.clear();
    this.listeners.clear();
    this.initPromise = null;
  }

  // ---- commands (user intent) ----

  async toggleLayer(id: SoundId): Promise<void> {
    await this.init();
    if (this.state.layers[id].enabled) this.disableLayer(id);
    else this.enableLayer(id);
  }

  setLayerVolume(id: SoundId, volume: number): void {
    const v = clamp01(volume);
    this.patchLayer(id, { volume: v });
    const player = this.players.get(id);
    if (player) player.volume = this.effectiveVolume(id);
  }

  setMasterVolume(master: number): void {
    this.state = { ...this.state, master: clamp01(master) };
    for (const [id, player] of this.players) player.volume = this.effectiveVolume(id);
    this.emit();
  }

  stopAll(): void {
    for (const id of SOUND_IDS) if (this.state.layers[id].enabled) this.disableLayer(id);
  }

  /**
   * Re-assert intent over reality: anything the user wants audible but the OS silenced gets restarted.
   * Called when the app returns to the foreground and from the UI's "Resume" affordance.
   */
  async resumeInterrupted(): Promise<void> {
    const stalled = SOUND_IDS.filter((id) => this.state.layers[id].interrupted);
    if (stalled.length === 0) return;
    await setIsAudioActiveAsync(true); // re-activate the session / re-acquire focus first
    for (const id of stalled) this.startPlayer(id);
  }

  // ---- internals ----

  private enableLayer(id: SoundId): void {
    this.patchLayer(id, { enabled: true });
    this.startPlayer(id);
  }

  private disableLayer(id: SoundId): void {
    this.patchLayer(id, { enabled: false, interrupted: false });
    this.lastCommandAt.set(id, Date.now());
    // pause(), not remove(): keeps the decoder warm so re-enabling is instant.
    // Trade-off: five paused players hold memory. Exercise: release after N seconds idle.
    this.players.get(id)?.pause();
  }

  private startPlayer(id: SoundId): void {
    const player = this.ensurePlayer(id);
    player.volume = this.effectiveVolume(id);
    this.lastCommandAt.set(id, Date.now());
    player.play(); // safe before the asset has finished loading; native queues it
  }

  /** Players are created lazily: 5 simultaneous decoders is real memory/CPU you only pay for if used. */
  private ensurePlayer(id: SoundId): AudioPlayer {
    const existing = this.players.get(id);
    if (existing) return existing;

    const def = SOUND_CATALOG.find((s) => s.id === id)!;
    const player = createAudioPlayer(def.source, {
      updateInterval: 500, // status event cadence in ms — each tick crosses native -> JS
      keepAudioSessionActive: true, // don't give up audio focus between pause/play
    });
    player.loop = true;
    this.statusSubs.set(
      id,
      player.addListener('playbackStatusUpdate', (status) => this.onStatus(id, status)),
    );
    this.players.set(id, player);
    return player;
  }

  private onStatus(id: SoundId, status: AudioStatus): void {
    const layer = this.state.layers[id];
    const sinceCommand = Date.now() - (this.lastCommandAt.get(id) ?? 0);
    const interrupted =
      layer.enabled &&
      status.isLoaded &&
      !status.playing &&
      !status.isBuffering &&
      sinceCommand > INTERRUPT_GRACE_MS;

    this.patchLayer(id, { loaded: status.isLoaded, playing: status.playing, interrupted });
  }

  private onAppStateChange = (next: AppStateStatus): void => {
    if (next === 'active') void this.resumeInterrupted();
  };

  private effectiveVolume(id: SoundId): number {
    return this.state.layers[id].volume * this.state.master;
  }

  /** Structural-sharing update; skips the notify entirely when nothing actually changed. */
  private patchLayer(id: SoundId, patch: Partial<LayerState>): void {
    const current = this.state.layers[id];
    const changed = (Object.keys(patch) as (keyof LayerState)[]).some((k) => current[k] !== patch[k]);
    if (!changed) return;
    this.state = {
      ...this.state,
      layers: { ...this.state.layers, [id]: { ...current, ...patch } },
    };
    this.emit();
  }

  private emit(): void {
    for (const l of this.listeners) l();
  }
}

// Fast Refresh re-evaluates this module on every edit. Without this guard the previous engine —
// and its still-playing native players — would be orphaned: audio you can no longer stop.
const g = globalThis as { __focusRealmAudioEngine?: AudioEngine };
g.__focusRealmAudioEngine?.dispose();
export const audioEngine = (g.__focusRealmAudioEngine = new AudioEngine());
