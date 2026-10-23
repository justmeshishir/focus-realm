import { setAudioModeAsync } from 'expo-audio';

/**
 * The audio *session* is process-wide OS state (AVAudioSession on iOS, AudioFocus on Android),
 * not a property of any single player. Configure it once, before the first player plays.
 */
export async function configureAudioSession(): Promise<void> {
  await setAudioModeAsync({
    // iOS: without this the hardware silent switch mutes us. Wrong for a sound machine
    // that people deliberately run with the ringer off.
    playsInSilentMode: true,

    // 'doNotMix' requests exclusive audio focus: other apps pause, and — crucially — the OS
    // tells us when a call/alarm/Siri takes focus. 'mixWithOthers' would let users layer
    // Spotify over rain, but on Android it requests *no* focus, so we would never be
    // notified of interruptions. That is a product trade-off; we pick interruption-awareness.
    interruptionMode: 'doNotMix',

    // Keeps the session alive when the app is backgrounded. Only takes effect in a development
    // or production build (Expo Go cannot declare UIBackgroundModes). See Milestone 2.
    shouldPlayInBackground: true,
  });
}
