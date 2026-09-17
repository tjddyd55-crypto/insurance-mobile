import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { SearchControlRow } from '../../components/SearchControlRow';
import {
  AppText,
  Card,
  Screen,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { getCustomer } from '../customers/customersApi';
import { customerQueryKeys } from '../customers/queryKeys';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';
import { getCustomerMap } from './customerMapApi';
import { hasNaverMapClientId, naverMapUnavailableMessage } from './customerMapModel';
import { NaverCustomerMapView } from './NaverCustomerMapView';

export function CustomerMapScreen({
  focusCustomerId = null,
  showBack = false,
}: {
  focusCustomerId?: number | null;
  showBack?: boolean;
} = {}) {
  const { token } = useAuth();
  const router = useRouter();
  const onBackPress = useCustomerDetailBack(focusCustomerId ?? 0);
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const focusCustomer = useQuery({
    queryKey: customerQueryKeys.detail(focusCustomerId ?? 0),
    queryFn: () => getCustomer(token, focusCustomerId!),
    enabled: Boolean(token && focusCustomerId),
  });
  useEffect(() => {
    if (!focusCustomerId || !focusCustomer.data) return;
    const nextKeyword = focusCustomer.data.name.trim() || focusCustomer.data.phone.trim();
    if (nextKeyword) {
      setKeywordDraft(nextKeyword);
      setKeyword(nextKeyword);
    }
  }, [focusCustomer.data, focusCustomerId]);

  const mapAvailable = hasNaverMapClientId();
  const query = useQuery({
    queryKey: ['customer-map', keyword, favoriteOnly],
    queryFn: () =>
      getCustomerMap(token, {
        keyword,
        favoriteOnly,
        radiusKm: null,
      }),
    enabled: Boolean(token),
  });

  const mapCustomers = query.data?.customers ?? [];

  const applySearch = () => {
    setKeyword(keywordDraft.trim());
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="고객 지도"
        showMenu={!showBack}
        showBack={showBack}
        onBackPress={showBack && focusCustomerId ? onBackPress : undefined}
      />
      <Screen padded={false} style={styles.screen}>
        <View style={styles.mapArea}>
          {query.isError ? (
            <View style={styles.errorOverlay}>
              <ErrorState
                title="고객 위치를 불러오지 못했습니다"
                message={
                  query.error instanceof Error
                    ? query.error.message
                    : '잠시 후 다시 시도해 주세요.'
                }
                onRetry={() => void query.refetch()}
              />
            </View>
          ) : null}

          {mapAvailable ? (
            <NaverCustomerMapView
              fullHeight
              centerLat={query.data?.centerLat ?? 37.5665}
              centerLng={query.data?.centerLng ?? 126.978}
              zoom={query.data?.zoom ?? 12}
              customers={mapCustomers}
              onMarkerPress={(customerId) => router.push(`/customers/${customerId}`)}
            />
          ) : (
            <Card variant="filled" style={styles.mapFallback}>
              <AppText variant="bodyStrong">네이버 지도 설정이 필요합니다.</AppText>
              <AppText variant="caption">{naverMapUnavailableMessage()}</AppText>
            </Card>
          )}

          <View style={styles.overlay} pointerEvents="box-none">
            <View style={styles.overlayCard} pointerEvents="auto">
              <SearchControlRow
                placeholder="이름 · 연락처 · 주소 검색"
                value={keywordDraft}
                onChangeText={setKeywordDraft}
                onSubmit={applySearch}
                accessibilityLabel="고객 지도 검색"
              />
            </View>
            <View style={styles.favoriteChip} pointerEvents="auto">
              <AppText variant="label">즐겨찾기만</AppText>
              <Switch value={favoriteOnly} onValueChange={setFavoriteOnly} />
            </View>
          </View>
        </View>
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    screen: { flex: 1 },
    mapArea: {
      flex: 1,
      position: 'relative',
    },
    mapFallback: {
      flex: 1,
      justifyContent: 'center',
      margin: theme.spacing.lg,
    },
    errorOverlay: {
      ...StyleSheet.absoluteFill,
      zIndex: 2,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.overlay,
    },
    overlay: {
      position: 'absolute',
      top: theme.spacing.md,
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      gap: theme.spacing.sm,
      zIndex: 3,
    },
    overlayCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      padding: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    favoriteChip: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
  });
}
