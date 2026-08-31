import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { createAppQueryClient } from '../src/api/queryClient';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { LoadingState } from '../src/components/LoadingState';

void SplashScreen.preventAutoHideAsync();

const queryClient = createAppQueryClient();

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (status === 'booting') {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'anonymous' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(app)');
    }
    void SplashScreen.hideAsync();
  }, [status, segments, router]);

  if (status === 'booting') {
    return <LoadingState message="ONE FC 시작 중…" />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <StatusBar style="dark" />
          <AuthGate>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" />
              <Stack.Screen name="(app)" />
              <Stack.Screen name="index" />
            </Stack>
          </AuthGate>
        </AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
