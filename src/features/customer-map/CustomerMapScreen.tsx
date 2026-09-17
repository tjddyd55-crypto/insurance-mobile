import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Switch, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { SearchControlRow } from '../../components/SearchControlRow';
import {
  AppText,
  Card,
  IconButton,
  Screen,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { getCustomer } from '../customers/customersApi';
import { customerQueryKeys } from '../customers/queryKeys';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';
import { getCustomerMap } from './customerMapApi';
import { CustomerMapSelectionOverlay } from './CustomerMapSelectionOverlay';
import { requestMyLocation } from './customerMapMyLocation';
import {
  buildCustomerMapMarkerGroups,
  type CustomerMapMarkerGroup,
} from './customerMapMarkerModel';
import { hasNaverMapClientId, naverMapUnavailableMessage } from './customerMapModel';
import {
  NaverCustomerMapView,
  type NaverCustomerMapHandle,
  type NaverMapBridgeMessage,
} from './NaverCustomerMapView';

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
  const mapRef = useRef<NaverCustomerMapHandle>(null);
  const [keywordDraft, setKeywordDraft] = useState('');
  const [keyword, setKeyword] = useState('');
  const [favoriteOnly, setFavoriteOnly] = useState(false);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
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
  const markerGroups = useMemo(() => buildCustomerMapMarkerGroups(mapCustomers), [mapCustomers]);
  const selectedGroup = useMemo(
    () => markerGroups.find((group) => group.groupKey === selectedGroupKey) ?? null,
    [markerGroups, selectedGroupKey],
  );

  const clearSelection = useCallback(() => {
    setSelectedGroupKey(null);
    setSelectedCustomerId(null);
  }, []);

  const selectGroup = useCallback((group: CustomerMapMarkerGroup, customerId: number) => {
    setSelectedGroupKey(group.groupKey);
    setSelectedCustomerId(customerId);
    mapRef.current?.panTo(group.latitude, group.longitude);
  }, []);

  useEffect(() => {
    if (!selectedGroupKey) return;
    const stillExists = markerGroups.some((group) => group.groupKey === selectedGroupKey);
    if (!stillExists) {
      clearSelection();
    }
  }, [clearSelection, markerGroups, selectedGroupKey]);

  const applySearch = () => {
    clearSelection();
    setKeyword(keywordDraft.trim());
  };

  const handleMyLocation = async () => {
    const result = await requestMyLocation();
    if (!result.ok) {
      if (result.reason === 'denied') {
        Alert.alert('위치 권한 필요', '내 위치를 표시하려면 위치 권한을 허용해 주세요.');
      }
      return;
    }
    clearSelection();
    mapRef.current?.panTo(result.latitude, result.longitude, 15);
  };

  const handleBridgeMessage = useCallback(
    (message: NaverMapBridgeMessage) => {
      if (message.type === 'map_click') {
        clearSelection();
        return;
      }
      if (message.type !== 'marker_select') {
        return;
      }
      const group = markerGroups.find((item) => item.groupKey === message.groupKey);
      if (!group) return;
      selectGroup(group, message.customerId);
    },
    [clearSelection, markerGroups, selectGroup],
  );

  useEffect(() => {
    if (!keyword.trim() || markerGroups.length === 0) return;
    const exact = markerGroups.find((group) =>
      group.customers.some((customer) => customer.name.includes(keyword)),
    );
    if (exact) {
      selectGroup(exact, exact.customers[0].id);
    }
  }, [keyword, markerGroups, selectGroup]);

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
              ref={mapRef}
              fullHeight
              centerLat={query.data?.centerLat ?? 37.5665}
              centerLng={query.data?.centerLng ?? 126.978}
              zoom={query.data?.zoom ?? 12}
              customers={mapCustomers}
              selectedGroupKey={selectedGroupKey}
              onBridgeMessage={handleBridgeMessage}
            />
          ) : (
            <Card variant="filled" style={styles.mapFallback}>
              <AppText variant="bodyStrong">네이버 지도 설정이 필요합니다.</AppText>
              <AppText variant="caption">{naverMapUnavailableMessage()}</AppText>
            </Card>
          )}

          <View style={styles.overlay} pointerEvents="box-none">
            <SearchControlRow
              placeholder="이름 · 연락처 · 주소 검색"
              value={keywordDraft}
              onChangeText={setKeywordDraft}
              onSubmit={applySearch}
              accessibilityLabel="고객 지도 검색"
              containerStyle={styles.searchRow}
            />
            <View style={styles.favoriteChip} pointerEvents="auto">
              <AppText variant="label">즐겨찾기만</AppText>
              <Switch
                value={favoriteOnly}
                onValueChange={(value) => {
                  clearSelection();
                  setFavoriteOnly(value);
                }}
              />
            </View>
          </View>

          <View style={styles.myLocationWrap} pointerEvents="box-none">
            <IconButton
              accessibilityLabel="내 위치"
              variant="outlined"
              size="md"
              onPress={() => void handleMyLocation()}
              icon={(color) => (
                <SymbolView
                  name={{ ios: 'location.fill', android: 'my_location' }}
                  size={20}
                  tintColor={color}
                />
              )}
              style={styles.myLocationButton}
            />
          </View>

          {selectedGroup && selectedCustomerId != null ? (
            <View style={styles.selectionOverlay} pointerEvents="box-none">
              <CustomerMapSelectionOverlay
                group={selectedGroup}
                selectedCustomerId={selectedCustomerId}
                onSelectCustomer={setSelectedCustomerId}
                onOpenDetail={(customerId) => router.push(`/customers/${customerId}`)}
                onClose={clearSelection}
              />
            </View>
          ) : null}
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
    searchRow: {
      width: '100%',
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
    myLocationWrap: {
      position: 'absolute',
      right: theme.spacing.lg,
      bottom: theme.spacing.xxl,
      zIndex: 3,
    },
    myLocationButton: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      ...theme.shadows.card,
    },
    selectionOverlay: {
      position: 'absolute',
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      bottom: theme.spacing.lg,
      zIndex: 4,
    },
  });
}
