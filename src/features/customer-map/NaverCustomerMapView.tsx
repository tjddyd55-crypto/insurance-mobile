import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { useAppTheme, type AppTheme } from '../../design-system';
import type { CustomerMapItem } from './types';
import { hasNaverMapClientId } from './customerMapModel';
import { buildNaverCustomerMapHtml, buildNaverMapMarkerGroups } from './naverMapHtml';

export type NaverCustomerMapViewProps = {
  centerLat: number;
  centerLng: number;
  zoom: number;
  customers: CustomerMapItem[];
  onMarkerPress: (customerId: number) => void;
};

export function NaverCustomerMapView({
  centerLat,
  centerLng,
  zoom,
  customers,
  onMarkerPress,
}: NaverCustomerMapViewProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
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
        onMessage={(event) => {
          try {
            const payload = JSON.parse(event.nativeEvent.data) as {
              type?: string;
              customerId?: number;
            };
            if (payload.type === 'marker_press' && payload.customerId) {
              onMarkerPress(payload.customerId);
            }
          } catch {
            // ignore malformed bridge messages
          }
        }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      height: 420,
      borderRadius: theme.radius.lg,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.colors.border,
    },
    map: {
      flex: 1,
      backgroundColor: theme.colors.surface,
    },
  });
}
