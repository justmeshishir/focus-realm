# Focus Realm

Gamified ambient sound mixer + focus timer. Expo SDK 58 (React Native 0.88, New Architecture), Expo Router, TypeScript. No backend.

## Run

```bash
npm install
npx expo start          # Expo Go is enough for Milestone 1
npm run typecheck && npm run lint
npm run gen:sounds      # regenerate the placeholder loops in assets/sounds
```

From Milestone 2 onward (background audio, notifications) a **development build** is required:
`npx expo run:ios` / `npx expo run:android`, or `npx eas-cli@latest build --profile development`.

## Layout

```
src/app/            routes only (Expo Router)   _layout.tsx, (tabs)/index.tsx, (tabs)/timer.tsx
src/audio/          engine, session config, sound catalog, React hooks
src/components/     presentational components
scripts/            asset generators
```

## Milestones

1. Project + multi-layer audio engine  ← current
2. Background playback, lock screen, interruption hardening
3. Gesture-driven sliders (Gesture Handler + Reanimated)
4. Haptics and micro-interactions
5. Focus timer + local notifications
6. Shared-element transitions + glassmorphism
