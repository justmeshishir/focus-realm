import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { audioEngine } from '@/audio/audioEngine';
import { colors } from '@/theme';

export default function RootLayout() {
  useEffect(() => {
    // Idempotent, so StrictMode's double-invoked effect is harmless.
    void audioEngine.init();
  }, []);

  return (
    // GestureHandlerRootView must wrap everything that uses gestures (Milestone 3).
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
