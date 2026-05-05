import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useUIStore } from '@/stores/uiStore';
import { useAuthStore } from '@/stores/authStore';
import { useDataStore } from '@/stores/dataStore';
import { startSyncListener } from '@/services/sync';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const theme = useUIStore(s => s.theme);
  const initTheme = useUIStore(s => s.initTheme);
  const initAuth = useAuthStore(s => s.initAuth);
  const initialize = useDataStore(s => s.initialize);

  useEffect(() => {
    (async () => {
      try {
        await initTheme();
        await initAuth();
        await initialize();
        startSyncListener();
      } catch (e) {
        console.warn('Init error:', e);
      } finally {
        setReady(true);
        SplashScreen.hideAsync();
      }
    })();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" />
      </Stack>
    </>
  );
}
