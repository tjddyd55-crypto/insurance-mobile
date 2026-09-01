import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import MapView, { Marker } from 'react-native-maps';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import {
  AppText, Badge, Button, Card, Inline, Screen, Stack, TextField,
  useAppTheme, type AppTheme,
} from '../../design-system';
import { getCustomerMap } from './customerMapApi';
import { groupCustomersByCoordinate, hasGoogleMapsApiKey } from './customerMapModel';

export function CustomerMapScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [keyword, setKeyword] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [radiusText, setRadiusText] = useState('');
  const radius = Number(radiusText);
  const mapAvailable = hasGoogleMapsApiKey();
  const query = useQuery({
    queryKey: ['customer-map', keyword, favoriteOnly, Number.isFinite(radius) ? radius : null],
    queryFn: () => getCustomerMap(token, {
      keyword,
      favoriteOnly,
      radiusKm: Number.isFinite(radius) && radius > 0 ? Math.min(radius, 100) : null,
    }),
    enabled: Boolean(token),
  });
  const groups = useMemo(
    () => [...groupCustomersByCoordinate(query.data?.customers ?? []).values()],
    [query.data?.customers],
  );

  return (
    <View style={styles.root}>
      <AppHeader title="고객 지도" />
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
                <MapView style={styles.map} initialRegion={{ latitude: query.data.centerLat, longitude: query.data.centerLng, latitudeDelta: 0.18, longitudeDelta: 0.18 }}>
                  {groups.map((group) => {
                    const first = group[0];
                    if (!first) return null;
                    return <Marker key={`${first.latitude}-${first.longitude}`} coordinate={{ latitude: first.latitude, longitude: first.longitude }} title={group.length > 1 ? `${first.name} 외 ${group.length - 1}명` : first.name} description={first.address} onCalloutPress={() => router.push(`/customers/${first.id}`)} />;
                  })}
                </MapView>
              ) : query.data.customers.length ? (
                <Card variant="filled"><Stack gap="xs"><AppText variant="bodyStrong">지도 설정이 필요합니다.</AppText><AppText variant="caption">Google Maps API 키가 포함된 앱 빌드에서 지도를 표시합니다. 아래 고객 목록은 계속 사용할 수 있습니다.</AppText></Stack></Card>
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
    map: { height: 420, borderRadius: theme.radius.lg },
  });
}
