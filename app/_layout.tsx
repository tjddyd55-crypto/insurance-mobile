import { Stack, useGlobalSearchParams, usePathname, useRouter, useSegments } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

import { createAppQueryClient } from '../src/api/queryClient';
import { AuthProvider, useAuth } from '../src/auth/AuthProvider';
import { LoadingState } from '../src/components/LoadingState';
import { AppErrorBoundary } from '../src/components/AppErrorBoundary';
import { getEnvironmentConfig } from '../src/config/environment';
import { DesignSystemProvider, useDesignSystem } from '../src/design-system';
import { AppUpdateHost } from '../src/features/app-update';
import { HomeWidgetSyncLifecycle } from '../src/features/home-widgets/useHomeWidgetSync';
import { consumePendingWidgetHref, stashPendingWidgetHref, widgetReturnHref } from '../src/features/home-widgets/engine/widgetDeepLink';
import { beginStashedWidgetOpen, observeAppPath } from '../src/features/home-widgets/widgetReturn';
import { usePushNotificationListeners } from '../src/features/push/usePushNotificationListeners';

void SplashScreen.preventAutoHideAsync();
const splashStartedAt = Date.now();
const MINIMUM_SPLASH_MS = 2000;

const queryClient = createAppQueryClient();

function ThemedStatusBar() {
  const { resolvedScheme } = useDesignSystem();
  return <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status } = useAuth();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();
  const searchParams = useGlobalSearchParams();
  const widgetHrefRef = useRef<string | null>(null);
  usePushNotificationListeners();

  useEffect(() => {
    widgetHrefRef.current = widgetReturnHref(pathname, searchParams);
    observeAppPath(pathname, searchParams);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (status === 'booting') {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    const isDevDesignSystem =
      getEnvironmentConfig().isDevApp && segments[0] === 'design-system';

    if (status === 'anonymous' && !inAuthGroup && !isDevDesignSystem) {
      stashPendingWidgetHref(widgetHrefRef.current);
      router.replace('/(auth)/login');
      return;
    } else if (status === 'authenticated' && inAuthGroup) {
      const widgetHref = consumePendingWidgetHref();
      if (widgetHref) beginStashedWidgetOpen();
      router.replace('/(app)');
      if (widgetHref) router.push(widgetHref as Parameters<typeof router.push>[0]);
      return;
    }
    const timer = setTimeout(() => {
      void SplashScreen.hideAsync();
    }, Math.max(0, MINIMUM_SPLASH_MS - (Date.now() - splashStartedAt)));
    return () => clearTimeout(timer);
  }, [status, segments, router]);

  if (status === 'booting') {
    return <LoadingState message="ONE FC 시작 중…" />;
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <DesignSystemProvider>
          <AppUpdateHost />
          <QueryClientProvider client={queryClient}>
            <AuthProvider>
              <AppErrorBoundary>
                <ThemedStatusBar />
                <HomeWidgetSyncLifecycle />
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
