import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import {
  AppText, Badge, Button, Card, Inline, Screen, Stack, TextField,
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

  return (
    <View style={styles.root}>
      <AppHeader
        title="고객 지도"
        showMenu={!showBack}
        showBack={showBack}
        onBackPress={showBack && focusCustomerId ? onBackPress : undefined}
      />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}
        >
          <TextField placeholder="이름 · 연락처 · 주소 검색" value={keyword} onChangeText={setKeyword} returnKeyType="search" />
          <Inline>
            <TextField label="반경(km)" value={radiusText} onChangeText={setRadiusText} keyboardType="decimal-pad" containerStyle={styles.grow} />
            <Inline style={styles.favorite}><AppText variant="label">즐겨찾기만</AppText><Switch value={favoriteOnly} onValueChange={setFavoriteOnly} /></Inline>
          </Inline>
          {query.isError ? <ErrorState title="고객 위치를 불러오지 못했습니다" message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void query.refetch()} /> : null}
          {query.data ? (
            <>
              <Inline wrap><Badge label={`전체 ${query.data.stats.totalCustomers}`} tone="info" /><Badge label={`지도 ${query.data.stats.mappedCount}`} tone="success" /><Badge label={`미표시 ${query.data.stats.unmappedCount}`} tone="warning" /></Inline>
              {query.data.customers.length && mapAvailable ? (
                <NaverCustomerMapView
                  centerLat={query.data.centerLat}
                  centerLng={query.data.centerLng}
                  zoom={query.data.zoom}
                  customers={query.data.customers}
                  onMarkerPress={(customerId) => router.push(`/customers/${customerId}`)}
                />
              ) : query.data.customers.length ? (
                <Card variant="filled">
                  <Stack gap="xs">
                    <AppText variant="bodyStrong">네이버 지도 설정이 필요합니다.</AppText>
                    <AppText variant="caption">{naverMapUnavailableMessage()}</AppText>
                  </Stack>
                </Card>
              ) : (
                <Card variant="outlined"><AppText color="textSecondary" align="center">표시할 고객 좌표가 없습니다.</AppText></Card>
              )}
              {query.data.customers.map((customer) => (
                <Card key={customer.id} variant="outlined"><Inline justify="space-between"><View style={styles.grow}><AppText variant="bodyStrong">{customer.name}</AppText><AppText variant="caption">{customer.address || '주소 없음'} · {customer.phone}</AppText></View><Button label="상세" size="sm" onPress={() => router.push(`/customers/${customer.id}`)} /></Inline></Card>
              ))}
              {query.data.unmappedCustomers.length ? (
                <Card variant="filled"><Stack gap="sm"><AppText variant="heading">지도 미표시 고객</AppText>{query.data.unmappedCustomers.map((customer) => <Inline key={customer.id} justify="space-between"><View style={styles.grow}><AppText>{customer.name}</AppText><AppText variant="caption">{customer.mapStatusLabel}</AppText></View><Button label="상세" size="sm" variant="ghost" onPress={() => router.push(`/customers/${customer.id}`)} /></Inline>)}</Stack></Card>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    grow: { flex: 1 },
    favorite: { paddingTop: theme.spacing.lg },
  });
}
