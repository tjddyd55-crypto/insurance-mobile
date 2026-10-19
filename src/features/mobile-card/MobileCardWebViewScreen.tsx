import { useCallback, useMemo, useRef, useState } from 'react';
import { BackHandler, Linking, Share, StyleSheet, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { resolveWebAppOrigin } from '../../config/environment';
import { useAppTheme, type AppTheme } from '../../design-system';
import {
  buildMobileCardUrl,
  buildSessionInjectionScript,
  buildWebSession,
  classifyMobileCardNavigation,
  CLEAR_WEB_SESSION_SCRIPT,
  parseMobileCardBridgeMessage,
  type MobileCardNavigation,
} from './mobileCardWebSession';

type Failure = { title: string; message: string } | null;

const LOGIN_FAILURE: Failure = {
  title: '모바일 명함을 열 수 없습니다',
  message: '로그인 정보를 확인하지 못했습니다. 다시 시도하거나 앱에서 다시 로그인해 주세요.',
};
const BLOCKED_FAILURE: Failure = {
  title: '앱에서 열 수 없는 화면입니다',
  message: '모바일 명함 편집 화면으로 돌아가 주세요.',
};
const LOAD_FAILURE: Failure = {
  title: '모바일 명함을 불러오지 못했습니다',
  message: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.',
};

/**
 * 모바일 명함 편집 — 앱 안 인증 WebView (네이티브 앱에서 유일한 WebView 화면).
 * URL 토큰 없음. 웹 인증 SSOT 키에 현재 앱 세션만 문서 로드 전에 쓴다.
 * 포커스가 있을 때만 WebView 를 띄우고, 계정이 바뀌면 key 로 새로 만든다.
 */
export function MobileCardWebViewScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const [focused, setFocused] = useState(false);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const webRef = useRef<WebView>(null);
  const canGoBackRef = useRef(false);
  const [failure, setFailureState] = useState<Failure>(null);
  const failureRef = useRef<Failure>(null);
  const setFailure = useCallback((next: Failure) => {
    failureRef.current = next;
    setFailureState(next);
  }, []);
  const [mountKey, setMountKey] = useState(0);

  const origin = useMemo(() => resolveWebAppOrigin(), []);
  const url = useMemo(() => buildMobileCardUrl(origin), [origin]);
  const session = useMemo(() => buildWebSession(token, user), [token, user]);
  const injected = useMemo(() => (session ? buildSessionInjectionScript(origin, session) : ''), [origin, session]);

  const leave = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, [router]);

  const goBack = useCallback(() => {
    if (!failureRef.current && canGoBackRef.current && webRef.current) {
      webRef.current.goBack();
      return true;
    }
    leave();
    return true;
  }, [leave]);

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
      return () => {
        subscription.remove();
        setFocused(false);
        // 화면을 떠나면 웹 저장소의 세션을 지운다(언마운트 직전 best-effort, 다음 로드도 먼저 비운다).
        webRef.current?.injectJavaScript(CLEAR_WEB_SESSION_SCRIPT);
      };
    }, [goBack]),
  );

  const retry = useCallback(() => {
    setFailure(null);
    canGoBackRef.current = false;
    setMountKey((value) => value + 1);
  }, [setFailure]);

  const apply = useCallback(
    (decision: MobileCardNavigation): boolean => {
      switch (decision.kind) {
        case 'allow':
          return true;
        case 'login':
          setFailure(LOGIN_FAILURE);
          return false;
        case 'dial':
          void Linking.openURL(decision.url).catch(() => undefined);
          return false;
        case 'external':
          void WebBrowser.openBrowserAsync(decision.url).catch(() => undefined);
          return false;
        case 'native':
          router.push(decision.path as never);
          return false;
        default:
          setFailure(BLOCKED_FAILURE);
          return false;
      }
    },
    [router, setFailure],
  );

  const onShouldStart = useCallback(
    (request: ShouldStartLoadRequest) => {
      if (request.isTopFrame === false) {
        const decision = classifyMobileCardNavigation(request.url, origin);
        return decision.kind === 'allow';
      }
      return apply(classifyMobileCardNavigation(request.url, origin));
    },
    [apply, origin],
  );

  // SPA(history) 이동은 onShouldStartLoadWithRequest 를 거치지 않는다 → 상태 변화로 같은 규칙을 적용한다.
  const onNavigationStateChange = useCallback(
    (state: WebViewNavigation) => {
      canGoBackRef.current = state.canGoBack;
      const decision = classifyMobileCardNavigation(state.url, origin);
      if (decision.kind === 'allow' || decision.kind === 'dial' || decision.kind === 'external') return;
      webRef.current?.stopLoading();
      if (decision.kind === 'native') {
        router.push(decision.path as never);
        retry();
        return;
      }
      apply(decision);
    },
    [apply, origin, retry, router],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const message = parseMobileCardBridgeMessage(event.nativeEvent.data, origin);
      if (!message) return;
      const content = message.url
        ? { title: message.title || undefined, message: message.url, url: message.url }
        : { title: message.title || undefined, message: message.text };
      void Share.share(content).catch(() => undefined);
    },
    [origin],
  );

  const header = <AppHeader title="모바일 명함" showBack onBackPress={goBack} showMenu={false} />;

  if (!session) {
    return (
      <View style={styles.root}>
        {header}
        <ErrorState title={LOGIN_FAILURE?.title} message={LOGIN_FAILURE?.message ?? ''} />
      </View>
    );
  }
  if (failure) {
    return (
      <View style={styles.root}>
        {header}
        <ErrorState title={failure.title} message={failure.message} onRetry={retry} />
      </View>
    );
  }
  return (
    <View style={styles.root}>
      {header}
      {focused ? (
        <WebView
          key={`${session.user.id}:${mountKey}`}
          ref={webRef}
          source={{ uri: url }}
          originWhitelist={['https://*', 'tel:*', 'sms:*', 'mailto:*']}
          injectedJavaScriptBeforeContentLoaded={injected}
          injectedJavaScriptBeforeContentLoadedForMainFrameOnly
          javaScriptEnabled
          domStorageEnabled
          incognito
          cacheEnabled={false}
          sharedCookiesEnabled={false}
          thirdPartyCookiesEnabled={false}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          pullToRefreshEnabled={false}
          startInLoadingState
          renderLoading={() => <LoadingState message="모바일 명함을 불러오는 중…" />}
          onShouldStartLoadWithRequest={onShouldStart}
          onNavigationStateChange={onNavigationStateChange}
          onOpenWindow={(event) => apply(classifyMobileCardNavigation(event.nativeEvent.targetUrl, origin))}
          onMessage={onMessage}
          onError={() => setFailure(LOAD_FAILURE)}
          onHttpError={(event) => {
            if (event.nativeEvent.statusCode >= 500) setFailure(LOAD_FAILURE);
          }}
          style={styles.web}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    web: { flex: 1, backgroundColor: theme.colors.background },
  });
}
