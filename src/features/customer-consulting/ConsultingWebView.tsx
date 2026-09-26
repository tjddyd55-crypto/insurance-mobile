import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, BackHandler, Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewMessageEvent, type WebViewNavigation } from 'react-native-webview';

import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { AppText, Button, Screen, useAppTheme, type AppTheme } from '../../design-system';
import { buildConsultingPageScript } from './consultingWebPage';
import { useConsultingDownloads } from './useConsultingDownloads';
import { useConsultingDrawerSwipeLock } from './useConsultingDrawerSwipeLock';
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

const PAGE_SCRIPT = buildConsultingPageScript();

export function ConsultingWebView({ title, origin, pageUrl, path, session }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const webRef = useRef<WebView>(null);
  const resumed = useRef(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [failed, setFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const downloads = useConsultingDownloads(origin, session);
  const beforeLoad = useMemo(
    () => `${buildWebCrmSessionInjectionScript(session)}\n${PAGE_SCRIPT}`,
    [session],
  );

  useConsultingDrawerSwipeLock();
  useClearSessionOnUnmount(webRef);
  useWebViewHardwareBack(webRef, canGoBack);

  const retry = () => {
    resumed.current = false;
    downloads.resetDownloads();
    setFailed(false);
    setReloadKey((value) => value + 1);
  };

  if (failed) {
    return (
      <LoadFailed
        title={title}
        styles={styles}
        onRetry={retry}
        onOpenBrowser={() => {
          void Linking.openURL(pageUrl);
        }}
      />
    );
  }

  return (
    <View style={styles.root}>
      <AppHeader title={title} />
      {downloads.downloadError ? <DownloadError message={downloads.downloadError} styles={styles} /> : null}
      <ConsultingPage
        webRef={webRef}
        reloadKey={reloadKey}
        pageUrl={pageUrl}
        beforeLoad={beforeLoad}
        styles={styles}
        indicatorColor={theme.colors.primary}
        onAllow={downloads.allowRequest}
        onFileDownload={downloads.shareIfAllowed}
        onMessage={downloads.onMessage}
        onNavigation={(nav) => {
          setCanGoBack(nav.canGoBack);
          resumeAfterLoginRedirect(nav, resumed, webRef, session, path);
        }}
        onFailed={() => setFailed(true)}
      />
    </View>
  );
}

function ConsultingPage({
  webRef,
  reloadKey,
  pageUrl,
  beforeLoad,
  styles,
  indicatorColor,
  onAllow,
  onFileDownload,
  onMessage,
  onNavigation,
  onFailed,
}: {
  webRef: { current: WebView | null };
  reloadKey: number;
  pageUrl: string;
  beforeLoad: string;
  styles: ReturnType<typeof createStyles>;
  indicatorColor: string;
  onAllow: (url: string) => boolean;
  onFileDownload: (url: string) => void;
  onMessage: (event: WebViewMessageEvent) => void;
  onNavigation: (nav: WebViewNavigation) => void;
  onFailed: () => void;
}) {
  return (
    <WebView
      key={reloadKey}
      ref={webRef}
      source={{ uri: pageUrl }}
      style={styles.web}
      originWhitelist={['https://*']}
      injectedJavaScriptBeforeContentLoaded={beforeLoad}
      injectedJavaScript={PAGE_SCRIPT}
      javaScriptEnabled
      domStorageEnabled
      sharedCookiesEnabled={false}
      thirdPartyCookiesEnabled={false}
      setSupportMultipleWindows={false}
      allowsBackForwardNavigationGestures={false}
      setBuiltInZoomControls
      setDisplayZoomControls={false}
      nestedScrollEnabled
      scalesPageToFit={false}
      startInLoadingState
      renderLoading={() => (
        <View style={styles.loading}>
          <ActivityIndicator color={indicatorColor} />
        </View>
      )}
      onShouldStartLoadWithRequest={(request) => onAllow(request.url)}
      onFileDownload={(event) => onFileDownload(event.nativeEvent.downloadUrl)}
      onMessage={onMessage}
      onNavigationStateChange={onNavigation}
      onError={onFailed}
      onHttpError={(event) => {
        if (event.nativeEvent.url.split('?')[0] === pageUrl) {
          onFailed();
        }
      }}
    />
  );
}

function useClearSessionOnUnmount(webRef: { current: WebView | null }) {
  useEffect(() => {
    const webView = webRef;
    return () => {
      webView.current?.injectJavaScript(buildWebCrmSessionClearScript());
    };
  }, [webRef]);
}

function useWebViewHardwareBack(webRef: { current: WebView | null }, canGoBack: boolean) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!canGoBack) {
        return false;
      }
      webRef.current?.goBack();
      return true;
    });
    return () => subscription.remove();
  }, [canGoBack, webRef]);
}

function resumeAfterLoginRedirect(
  nav: WebViewNavigation,
  resumed: { current: boolean },
  webRef: { current: WebView | null },
  session: WebCrmSession,
  path: string,
) {
  if (resumed.current || !isLoginPath(nav.url)) {
    return;
  }
  resumed.current = true;
  webRef.current?.injectJavaScript(buildWebCrmSessionResumeScript(session, path));
}

function isLoginPath(rawUrl: string): boolean {
  try {
    const path = new URL(rawUrl).pathname;
    return path === '/login' || path.startsWith('/login/');
  } catch {
    return false;
  }
}

function DownloadError({
  message,
  styles,
}: {
  message: string;
  styles: ReturnType<typeof createStyles>;
}) {
  return (
    <AppText variant="caption" color="danger" accessibilityLiveRegion="polite" style={styles.error}>
      {message}
    </AppText>
  );
}

function LoadFailed({
  title,
  styles,
  onRetry,
  onOpenBrowser,
}: {
  title: string;
  styles: ReturnType<typeof createStyles>;
  onRetry: () => void;
  onOpenBrowser: () => void;
}) {
  return (
    <View style={styles.root}>
      <AppHeader title={title} />
      <Screen padded>
        <EmptyState compact title={title} message="상담 화면을 불러오지 못했습니다." />
        <View style={styles.actions}>
          <Button label="다시 시도" onPress={onRetry} />
          <Button label="브라우저에서 열기" variant="secondary" onPress={onOpenBrowser} />
        </View>
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    web: { flex: 1, backgroundColor: theme.colors.background },
    error: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm,
      backgroundColor: theme.colors.dangerSoft,
    },
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
