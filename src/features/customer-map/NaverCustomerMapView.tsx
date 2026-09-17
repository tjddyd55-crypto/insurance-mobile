import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import type { CustomerMapItem } from './types';
import { hasNaverMapClientId } from './customerMapModel';
import { buildNaverCustomerMapHtml, buildNaverMapMarkerGroups } from './naverMapHtml';

export type NaverCustomerMapViewProps = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  customers: CustomerMapItem[];
  onMarkerPress: (customerId: number) => void;
  fullHeight?: boolean;
};

export function NaverCustomerMapView({
  centerLat,
  centerLng,
  zoom,
  customers,
  onMarkerPress,
  fullHeight = false,
}: NaverCustomerMapViewProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme, fullHeight), [theme, fullHeight]);
  const [debugMessage, setDebugMessage] = useState<string | null>(null);
  const clientId = process.env.EXPO_PUBLIC_NAVER_MAP_CLIENT_ID?.trim() ?? '';
  const html = useMemo(
    () =>
      buildNaverCustomerMapHtml({
        clientId,
        centerLat,
        centerLng,
        zoom,
        groups: buildNaverMapMarkerGroups(customers),
      }),
    [centerLat, centerLng, clientId, customers, zoom],
  );

  if (!hasNaverMapClientId(clientId)) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
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
            const payload = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              customerId?: number;
            };
            if (__DEV__ && payload.type === 'auth_failure') {
              setDebugMessage('Naver map auth failure');
            }
            if (__DEV__ && payload.type === 'init_failure') {
              setDebugMessage('Naver map init failure');
            }
            if (payload.type === 'marker_press' && payload.customerId) {
              onMarkerPress(payload.customerId);
            }
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
}

function createStyles(theme: AppTheme, fullHeight: boolean) {
  return StyleSheet.create({
    wrap: {
      flex: fullHeight ? 1 : undefined,
      height: fullHeight ? undefined : 420,
      minHeight: fullHeight ? 280 : undefined,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
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
