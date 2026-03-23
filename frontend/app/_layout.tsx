import { ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import React, { useEffect, useState, useCallback } from 'react';
import { View } from 'react-native';

import { paperTheme, colors } from '@/constants/theme';
import { SplashAnimation } from '@/components/SplashAnimation';
import { OfflineBanner } from '@/components/OfflineBanner';
import { useApiHealth } from '@/hooks/useApiHealth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Global defaults for device resilience
      networkMode: 'always', // Keep polling even when offline
      refetchOnReconnect: true,
      refetchOnMount: true,
    },
  },
});

/** React Navigation theme derived from our Paper theme */
const navTheme = {
  dark: true,
  colors: {
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.danger,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '800' as const },
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

/** Inner component that uses the health hook (needs QueryClientProvider) */
function AppContent() {
  const { isConnected, isChecking, retry } = useApiHealth();

  return (
    <>
      <OfflineBanner isConnected={isConnected} isChecking={isChecking} onRetry={retry} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="modal"
          options={{
            presentation: 'modal',
            headerShown: true,
            headerTitle: 'Settings',
            headerStyle: { backgroundColor: colors.surface },
            headerTintColor: colors.textPrimary,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        await Asset.loadAsync([require('@/assets/images/icon.png')]);
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        setAppIsReady(true);
      }
    }
    prepare();
  }, []);

  const onAnimationFinish = useCallback(() => {
    setAnimationFinished(true);
  }, []);

  useEffect(() => {
    if (appIsReady) {
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider theme={paperTheme}>
        <ThemeProvider value={navTheme}>
          {!animationFinished && <SplashAnimation onFinish={onAnimationFinish} />}
          <AppContent />
          <StatusBar style="light" />
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
