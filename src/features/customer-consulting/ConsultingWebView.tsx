import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';

import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { Button, Screen, useAppTheme, type AppTheme } from '../../design-system';
import { evaluateConsultingWebNavigation } from './consultingWebNavigation';
import {
  buildWebCrmSessionClearScript,
  buildWebCrmSessionInjectionScript,
  buildWebCrmSessionResumeScript,
  type WebCrmSession,
} from './webCrmSession';

type Props = {
  title: string;
  origin: string;
  pageUrl: string;
  path: string;
  session: WebCrmSession;
};

export function ConsultingWebView({ title, origin, pageUrl, path, session }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const webRef = useRef<WebView>(null);
  const resumed = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const injection = useMemo(() => buildWebCrmSessionInjectionScript(session), [session]);

  useEffect(() => {
    const webView = webRef;
    return () => {
      webView.current?.injectJavaScript(buildWebCrmSessionClearScript());
    };
  }, []);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) {
        return false;
      }
      webRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack]);

  const onNavigation = (nav: WebViewNavigation) => {
    setCanGoBack(nav.canGoBack);
    resumeAfterLoginRedirect(nav.url);
  };

  const resumeAfterLoginRedirect = (url: string) => {
    if (resumed.current || !isLoginPath(url)) {
      return;
    }
    resumed.current = true;
    webRef.current?.injectJavaScript(buildWebCrmSessionResumeScript(session, path));
  };

  const allowRequest = (url: string) => {
    return evaluateConsultingWebNavigation(url, origin, session.token) === 'allow';
  };
  const retry = () => {
    resumed.current = false;
    setFailed(false);
    setReloadKey((value) => value + 1);
  };
  const openInBrowser = () => {
    void Linking.openURL(pageUrl);
  };

  if (failed) {
    return (
      <View style={styles.root}>
        <AppHeader title={title} />
        <Screen padded>
          <EmptyState compact title={title} message="상담 화면을 불러오지 못했습니다." />
          <View style={styles.actions}>
            <Button label="다시 시도" onPress={retry} />
            <Button label="브라우저에서 열기" variant="secondary" onPress={openInBrowser} />
          </View>
        </Screen>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title={title} />
      <WebView
        key={reloadKey}
        ref={webRef}
        source={{ uri: pageUrl }}
        style={styles.web}
        originWhitelist={['https://*']}
        injectedJavaScriptBeforeContentLoaded={injection}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled={false}
        thirdPartyCookiesEnabled={false}
        setSupportMultipleWindows={false}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator color={theme.colors.primary} />
          </View>
        )}
        onShouldStartLoadWithRequest={(request) => allowRequest(request.url)}
        onNavigationStateChange={onNavigation}
        onError={() => setFailed(true)}
        onHttpError={(event) => {
          if (event.nativeEvent.url.split('?')[0] === pageUrl) {
            setFailed(true);
          }
        }}
      />
    </View>
  );
}

function isLoginPath(rawUrl: string): boolean {
  try {
    const path = new URL(rawUrl).pathname;
    return path === '/login' || path.startsWith('/login/');
  } catch {
    return false;
  }
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    web: { flex: 1, backgroundColor: theme.colors.background },
    actions: { gap: theme.spacing.sm },
    loading: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.colors.background,
    },
  });
}
