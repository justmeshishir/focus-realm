import { setAudioModeAsync, type AudioMode } from 'expo-audio';

const PREFERRED_MODE: Partial<AudioMode> = {
  // iOS: without this the hardware silent switch mutes us. Wrong for a sound machine
  // that people deliberately run with the ringer off.
  playsInSilentMode: true,

  // 'doNotMix' requests exclusive audio focus: other apps pause, and — crucially — the OS
  // tells us when a call/alarm/Siri takes focus. 'mixWithOthers' would let users layer
  // Spotify over rain, but on Android it requests *no* focus, so we would never be
  // notified of interruptions. That is a product trade-off; we pick interruption-awareness.
  interruptionMode: 'doNotMix',

  // Keeps playback alive when the app is backgrounded. Needs UIBackgroundModes=audio, which the
  // expo-audio config plugin adds to development/production builds. See Milestone 2.
  shouldPlayInBackground: true,
};

/**
 * The audio *session* is process-wide OS state (AVAudioSession on iOS, AudioFocus on Android),
 * not a property of any single player. Configure it once, before the first player plays.
 *
 * Returns a human-readable description of the mode that was actually applied.
 */
export async function configureAudioSession(): Promise<string> {
  try {
    await setAudioModeAsync(PREFERRED_MODE);
    return JSON.stringify(PREFERRED_MODE);
  } catch (e) {
    // Native validation rejected the preferred mode. Foreground playback matters more than
    // background playback, so degrade rather than leave the app silent — but say so loudly.
    const degraded: Partial<AudioMode> = { ...PREFERRED_MODE, shouldPlayInBackground: false };
    try {
      await setAudioModeAsync(degraded);
    } catch (e2) {
      const reason = e2 instanceof Error ? e2.message : String(e2);
      throw new Error(`${reason} [sent ${JSON.stringify(degraded)}]`);
    }
    const reason = e instanceof Error ? e.message : String(e);
    return `DEGRADED ${JSON.stringify(degraded)} because: ${reason} [first attempt sent ${JSON.stringify(PREFERRED_MODE)}]`;
  }
}
