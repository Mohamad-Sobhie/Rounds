import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { recordEndedWorkout } from '@/activity/activity';
import { colors, fontAssets } from '@/theme';
import { sessionStore } from '@/workout/session';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = fontsLoaded || fontError !== null;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  // A workout may have finished while the app was closed: log it once the session is restored.
  useEffect(() => {
    if (sessionStore.persist.hasHydrated()) void recordEndedWorkout();
    return sessionStore.persist.onFinishHydration(() => void recordEndedWorkout());
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      />
    </>
  );
}
