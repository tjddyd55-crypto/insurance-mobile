import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import type { CustomerMapMarkerGroup } from './customerMapMarkerModel';

type CustomerMapSelectionOverlayProps = {
  group: CustomerMapMarkerGroup;
  selectedCustomerId: number;
  onSelectCustomer: (customerId: number) => void;
  onOpenDetail: (customerId: number) => void;
  onClose: () => void;
};

export function CustomerMapSelectionOverlay({
  group,
  selectedCustomerId,
  onSelectCustomer,
  onOpenDetail,
  onClose,
}: CustomerMapSelectionOverlayProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selected =
    group.customers.find((customer) => customer.id === selectedCustomerId) ?? group.customers[0];
  const isGroup = group.count > 1;

  if (!selected) {
    return null;
  }

  if (!isGroup) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${selected.name} 고객 상세 보기`}
        onPress={() => onOpenDetail(selected.id)}
        style={styles.singleCard}
      >
        <View style={styles.singleHeader}>
          <AppText variant="bodyStrong" numberOfLines={1}>
            {selected.isFavorite ? '★ ' : ''}
            {selected.name || '이름 없음'}
          </AppText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="선택 닫기"
            onPress={(event) => {
              event.stopPropagation();
              onClose();
            }}
            hitSlop={8}
          >
            <AppText variant="caption" color="textSecondary">닫기</AppText>
          </Pressable>
        </View>
        <AppText variant="caption" color="textSecondary" numberOfLines={2}>
          {selected.address?.trim() || '주소 없음'}
        </AppText>
        <AppText variant="helper" color="primary">탭하여 고객 상세 보기</AppText>
      </Pressable>
    );
  }

  return (
    <View style={styles.groupCard} accessibilityLabel="동일 위치 고객 목록">
      <View style={styles.singleHeader}>
        <AppText variant="bodyStrong">{group.count}명 · 동일 위치</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="선택 닫기" onPress={onClose} hitSlop={8}>
          <AppText variant="caption" color="textSecondary">닫기</AppText>
        </Pressable>
      </View>
      {group.customers.map((customer) => {
        const active = customer.id === selectedCustomerId;
        return (
          <Pressable
            key={customer.id}
            accessibilityRole="button"
            accessibilityLabel={`${customer.name} 선택`}
            onPress={() => onSelectCustomer(customer.id)}
            style={[styles.groupRow, active && styles.groupRowActive]}
          >
            <AppText variant="body" numberOfLines={1}>
              {customer.isFavorite ? '★ ' : ''}
              {customer.name || '이름 없음'}
            </AppText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${customer.name} 상세 보기`}
              onPress={() => onOpenDetail(customer.id)}
              hitSlop={8}
            >
              <AppText variant="caption" color="primary">상세</AppText>
            </Pressable>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    singleCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.xs,
      ...theme.shadows.floating,
    },
    groupCard: {
      borderRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
      maxHeight: 220,
      ...theme.shadows.floating,
    },
    singleHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    groupRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
    },
    groupRowActive: {
      backgroundColor: theme.colors.primarySoft,
    },
  });
}
