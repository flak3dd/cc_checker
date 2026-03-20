import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import * as SplashScreen from 'expo-splash-screen';
import { Asset } from 'expo-asset';
import React, { useEffect, useState, useCallback } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SplashAnimation } from '@/components/SplashAnimation';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [appIsReady, setAppIsReady] = useState(false);
  const [animationFinished, setAnimationFinished] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        console.log('App: Preparing...');
        // Pre-load images/assets
        await Asset.loadAsync([
          require('@/assets/images/icon.png'),
        ]);
        
        // Wait a bit for other things
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (e) {
        console.warn(e);
      } finally {
        console.log('App: Ready');
        // Tell the application to render
        setAppIsReady(true);
      }
    }

    prepare();
  }, []);

  const onAnimationFinish = useCallback(() => {
    console.log('App: Animation finished');
    setAnimationFinished(true);
  }, []);

  useEffect(() => {
    if (appIsReady) {
      console.log('App: Hiding native splash');
      // Hide the native splash screen as soon as our custom animation is ready to take over
      SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <PaperProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {!animationFinished && (
            <SplashAnimation onFinish={onAnimationFinish} />
          )}
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </PaperProvider>
    </QueryClientProvider>
  );
}
