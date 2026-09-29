import { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { resolveApiBaseUrl } from '../../config/environment';
import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import type { CustomerMapItem } from './types';
import { hasNaverMapClientId } from './customerMapModel';
import { buildCustomerMapMarkerGroups } from './customerMapMarkerModel';
import { buildNaverCustomerMapHtml } from './naverMapHtml';

function resolveNaverMapWebViewBaseUrl(): string {
  const prodOrigin = resolveApiBaseUrl('production').replace(/\/$/, '');
  return `${prodOrigin}/`;
}

export type NaverMapBridgeMessage =
  | { type: 'marker_select'; groupKey: string; customerId: number; isGroup: boolean }
  | { type: 'map_click' }
  | { type: 'auth_failure' }
  | { type: 'init_failure' }
  | { type: 'ready' };

export type NaverCustomerMapHandle = {
  panTo: (latitude: number, longitude: number, zoom?: number) => void;
};

export type NaverCustomerMapViewProps = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  customers: CustomerMapItem[];
  selectedGroupKey?: string | null;
  onBridgeMessage: (message: NaverMapBridgeMessage) => void;
  fullHeight?: boolean;
};

export const NaverCustomerMapView = forwardRef<NaverCustomerMapHandle, NaverCustomerMapViewProps>(
  function NaverCustomerMapView(
    {
      centerLat,
      centerLng,
      zoom,
      customers,
      selectedGroupKey = null,
      onBridgeMessage,
      fullHeight = false,
    },
    ref,
  ) {
    const theme = useAppTheme();
    const styles = useMemo(() => createStyles(theme, fullHeight), [theme, fullHeight]);
    const [debugMessage, setDebugMessage] = useState<string | null>(null);
    const webViewRef = useRef<WebView>(null);
    const clientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ?? '';
    const groups = useMemo(() => buildCustomerMapMarkerGroups(customers), [customers]);
    const html = useMemo(
      () =>
        buildNaverCustomerMapHtml({
          clientId,
          centerLat,
          centerLng,
          zoom,
          groups,
          selectedGroupKey,
        }),
      [centerLat, centerLng, clientId, groups, selectedGroupKey, zoom],
    );

    const postNativeCommand = useCallback((command: Record<string, unknown>) => {
      const payload = JSON.stringify(command);
      webViewRef.current?.injectJavaScript(
        `(function(){ if (window.__handleNativeCommand) window.__handleNativeCommand(${payload}); })(); true;`,
      );
    }, []);

    const panTo = useCallback(
      (latitude: number, longitude: number, nextZoom?: number) => {
        postNativeCommand({
          type: 'pan_to',
          lat: latitude,
          lng: longitude,
          zoom: nextZoom ?? zoom,
        });
      },
      [postNativeCommand, zoom],
    );

    useImperativeHandle(ref, () => ({ panTo }), [panTo]);

    if (!hasNaverMapClientId(clientId)) {
      return null;
    }

    return (
      <View style={styles.wrap}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html, baseUrl: resolveNaverMapWebViewBaseUrl() }}
          style={styles.map}
          scrollEnabled={false}
          nestedScrollEnabled
          javaScriptEnabled
          domStorageEnabled
          mixedContentMode="always"
          onError={() => {
            if (__DEV__) {
              setDebugMessage('WebView load error');
            }
          }}
          onHttpError={(event) => {
            if (__DEV__) {
              setDebugMessage(`HTTP ${event.nativeEvent.statusCode}: ${event.nativeEvent.url}`);
            }
          }}
          onMessage={(event) => {
            try {
              const payload = JSON.parse(event.nativeEvent.data) as NaverMapBridgeMessage;
              if (__DEV__ && payload.type === 'auth_failure') {
                setDebugMessage('Naver map auth failure');
              }
              if (__DEV__ && payload.type === 'init_failure') {
                setDebugMessage('Naver map init failure');
              }
              onBridgeMessage(payload);
            } catch {
              // ignore malformed bridge messages
            }
          }}
        />
        {__DEV__ && debugMessage ? (
          <View style={styles.debugBanner}>
            <AppText variant="caption" color="danger">{debugMessage}</AppText>
          </View>
        ) : null}
      </View>
    );
  },
);

function createStyles(theme: AppTheme, fullHeight: boolean) {
  return StyleSheet.create({
    wrap: {
      flex: fullHeight ? 1 : undefined,
      height: fullHeight ? undefined : 420,
      minHeight: fullHeight ? 280 : undefined,
      borderRadius: fullHeight ? 0 : theme.radius.lg,
      overflow: 'hidden',
    },
    map: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
    debugBanner: {
      position: 'absolute',
      left: theme.spacing.sm,
      right: theme.spacing.sm,
      bottom: theme.spacing.sm,
      padding: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surface,
    },
  });
}
