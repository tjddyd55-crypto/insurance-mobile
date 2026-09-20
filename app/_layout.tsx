import { Stack, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { createAppQueryClient } from '../src/api/queryClient';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { LoadingState } from '../src/components/LoadingState';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { getEnvironmentConfig } from '../src/config/environment';
import { DesignSystemProvider, useDesignSystem } from '../src/design-system';
import { usePushNotificationListeners } from '../src/features/push/usePushNotificationListeners';
import { OTA_BUILD_MARKER } from '../src/config/otaBuildMarker';
import { checkForAppUpdateOnce } from '../src/services/appUpdates';

void SplashScreen.preventAutoHideAsync();

const queryClient = createAppQueryClient();

function ThemedStatusBar() {
  const { resolvedScheme } = useDesignSystem();
  return <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  usePushNotificationListeners();

  useEffect(() => {
    if (status === 'booting') {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    const isDevDesignSystem =
      getEnvironmentConfig().isDevApp && segments[0] === 'design-system';

    if (status === 'anonymous' && !inAuthGroup && !isDevDesignSystem) {
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
  useEffect(() => {
    if (!__DEV__) {
      console.info('[AppBootstrap] otaBuildMarker', OTA_BUILD_MARKER);
    }
    void checkForAppUpdateOnce();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <DesignSystemProvider>
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppErrorBoundary>
                <ThemedStatusBar />
                <AuthGate>
                  <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                    <Stack.Screen name="index" />
                    <Stack.Screen name="design-system" />
                  </Stack>
                </AuthGate>
              </AppErrorBoundary>
            </AuthProvider>
          </QueryClientProvider>
        </DesignSystemProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
