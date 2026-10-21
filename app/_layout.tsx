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
  // 이동 판단(effect 의존성)은 그대로 두고, 위젯 복귀 href 계산에만 최신 경로를 쓴다.
  const widgetHrefRef = useRef<string | null>(null);
  usePushNotificationListeners();

  // 아래 이동 effect 보다 먼저 선언해 같은 커밋에서 최신 값을 쓴다.
  useEffect(() => {
    widgetHrefRef.current = widgetReturnHref(pathname, searchParams);
  }, [pathname, searchParams]);

  useEffect(() => {
    if (status === 'booting') {
      return;
    }
    const inAuthGroup = segments[0] === '(auth)';
    const isDevDesignSystem =
      getEnvironmentConfig().isDevApp && segments[0] === 'design-system';

    if (status === 'anonymous' && !inAuthGroup && !isDevDesignSystem) {
      // 위젯에서 연 화면이면 로그인 후 그 화면으로 한 번 돌아간다.
      stashPendingWidgetHref(widgetHrefRef.current);
      router.replace('/(auth)/login');
      return;
    } else if (status === 'authenticated' && inAuthGroup) {
      router.replace('/(app)');
      const widgetHref = consumePendingWidgetHref();
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
