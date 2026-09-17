import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import {
  AppText, Badge, Card, Inline, Screen, Stack, TextField,
  useAppTheme, type AppTheme,
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
  const [keyword, setKeyword] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [radiusText, setRadiusText] = useState('');
  const focusCustomer = useQuery({
    queryKey: customerQueryKeys.detail(focusCustomerId ?? 0),
    queryFn: () => getCustomer(token, focusCustomerId!),
    enabled: Boolean(token && focusCustomerId),
  });
  useEffect(() => {
    if (!focusCustomerId || !focusCustomer.data) return;
    const nextKeyword = focusCustomer.data.name.trim() || focusCustomer.data.phone.trim();
    if (nextKeyword) setKeyword(nextKeyword);
  }, [focusCustomer.data, focusCustomerId]);
  const radius = Number(radiusText);
  const mapAvailable = hasNaverMapClientId();
  const query = useQuery({
    queryKey: ['customer-map', keyword, favoriteOnly, Number.isFinite(radius) ? radius : null],
    queryFn: () => getCustomerMap(token, {
      keyword,
      favoriteOnly,
      radiusKm: Number.isFinite(radius) && radius > 0 ? Math.min(radius, 100) : null,
    }),
    enabled: Boolean(token),
  });

  const mapCustomers = query.data?.customers ?? [];

  return (
    <View style={styles.root}>
      <AppHeader
        title="고객 지도"
        showMenu={!showBack}
        showBack={showBack}
        onBackPress={showBack && focusCustomerId ? onBackPress : undefined}
      />
      <Screen padded={false} style={styles.screen}>
        <View style={styles.controls}>
          <TextField
            placeholder="이름 · 연락처 · 주소 검색"
            value={keyword}
            onChangeText={setKeyword}
            returnKeyType="search"
          />
          <Inline>
            <TextField
              label="반경(km)"
              value={radiusText}
              onChangeText={setRadiusText}
              keyboardType="decimal-pad"
              containerStyle={styles.grow}
            />
            <Inline style={styles.favorite}>
              <AppText variant="label">즐겨찾기만</AppText>
              <Switch value={favoriteOnly} onValueChange={setFavoriteOnly} />
            </Inline>
          </Inline>
          {query.data ? (
            <Inline wrap>
              <Badge label={`전체 ${query.data.stats.totalCustomers}`} tone="info" />
              <Badge label={`지도 ${query.data.stats.mappedCount}`} tone="success" />
              <Badge label={`미표시 ${query.data.stats.unmappedCount}`} tone="warning" />
            </Inline>
          ) : null}
        </View>

        <View style={styles.mapArea}>
          {query.isError ? (
            <ErrorState
              title="고객 위치를 불러오지 못했습니다"
              message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
              onRetry={() => void query.refetch()}
            />
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
              <Stack gap="xs">
                <AppText variant="bodyStrong">네이버 지도 설정이 필요합니다.</AppText>
                <AppText variant="caption">{naverMapUnavailableMessage()}</AppText>
              </Stack>
            </Card>
          )}
        </View>

        {query.data?.unmappedCustomers.length ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.unmappedRow}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => void query.refetch()}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            {query.data.unmappedCustomers.map((customer) => (
              <Card key={customer.id} variant="outlined" style={styles.unmappedCard}>
                <AppText variant="bodyStrong" numberOfLines={1}>{customer.name}</AppText>
                <AppText variant="caption" numberOfLines={1}>{customer.mapStatusLabel}</AppText>
              </Card>
            ))}
          </ScrollView>
        ) : null}
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    screen: { flex: 1 },
    controls: {
      paddingHorizontal: theme.spacing.lg,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.sm,
      gap: theme.spacing.sm,
    },
    grow: { flex: 1 },
    favorite: { paddingTop: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.xs },
    mapArea: {
      flex: 1,
      minHeight: 320,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.sm,
    },
    mapFallback: {
      flex: 1,
      justifyContent: 'center',
    },
    unmappedRow: {
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    unmappedCard: {
      width: 180,
    },
  });
}
