import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, useBottomSafeInset, type AppTheme } from '../../design-system';
import { CustomerActionIcon, openPhoneUrl } from '../customers/CustomerActionIcon';
import { buildCustomerPhoneSchemeUrl } from '../customers/customerModel';
import {
  buildCustomerMapPanelPresentation,
  buildGroupSelectionTitle,
} from './customerMapSelectionPresentation';
import type { CustomerMapMarkerGroup } from './customerMapMarkerModel';
import type { CustomerMapItem } from './types';

type CustomerMapSelectionOverlayProps = {
  group: CustomerMapMarkerGroup;
  selectedCustomerId: number;
  onSelectCustomer: (customerId: number) => void;
  onOpenDetail: (customerId: number) => void;
};

function CustomerMapInfoPanel({
  customer,
  onOpenDetail,
  styles,
  theme,
}: {
  customer: CustomerMapItem;
  onOpenDetail: (customerId: number) => void;
  styles: ReturnType<typeof createStyles>;
  theme: AppTheme;
}) {
  const presentation = buildCustomerMapPanelPresentation(customer);
  const telUrl = buildCustomerPhoneSchemeUrl(customer.phone, 'tel');
  const smsUrl = buildCustomerPhoneSchemeUrl(customer.phone, 'sms');
  const genderColor =
    presentation.genderTone === 'male'
      ? theme.colors.info
      : presentation.genderTone === 'female'
        ? theme.colors.danger
        : undefined;

  const content = (
    <>
      <View style={styles.headerRow}>
        <View style={styles.nameRow}>
          {customer.isFavorite ? (
            <AppText variant="bodyStrong" color="warning">★ </AppText>
          ) : null}
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.nameText}>
            {presentation.displayName}
          </AppText>
          {presentation.genderParenthetical ? (
            <AppText
              variant="body"
              style={[styles.genderText, genderColor ? { color: genderColor } : null]}
            >
              {presentation.genderParenthetical}
            </AppText>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="고객 상세 보기"
          onPress={() => onOpenDetail(customer.id)}
          hitSlop={8}
          style={styles.detailAction}
        >
          <AppText variant="bodyStrong" color="primary">상세</AppText>
        </Pressable>
      </View>

      <View style={styles.infoRow}>
        <AppText variant="caption" color="textSecondary" style={styles.infoLabel}>
          생년월일
        </AppText>
        <AppText variant="body" style={styles.infoValue}>{presentation.birthDate}</AppText>
      </View>
      <View style={styles.infoRow}>
        <AppText variant="caption" color="textSecondary" style={styles.infoLabel}>
          연락처
        </AppText>
        <AppText variant="body" style={styles.infoValue} numberOfLines={1}>
          {presentation.phone}
        </AppText>
        <View style={styles.phoneActions}>
          <CustomerActionIcon
            kind="sms"
            disabled={!smsUrl}
            accessibilityLabel="문자 보내기"
            onPress={() => openPhoneUrl(smsUrl)}
          />
          <CustomerActionIcon
            kind="tel"
            disabled={!telUrl}
            accessibilityLabel="전화 걸기"
            onPress={() => openPhoneUrl(telUrl)}
          />
        </View>
      </View>
      <View style={styles.addressBlock}>
        <AppText variant="caption" color="textSecondary" style={styles.infoLabel}>
          주소
        </AppText>
        <AppText variant="body" style={styles.addressValue} numberOfLines={2}>
          {presentation.address}
        </AppText>
      </View>
    </>
  );

  return <View style={styles.infoBody}>{content}</View>;
}

export function CustomerMapSelectionOverlay({
  group,
  selectedCustomerId,
  onSelectCustomer,
  onOpenDetail,
}: CustomerMapSelectionOverlayProps) {
  const theme = useAppTheme();
  const bottomInset = useBottomSafeInset();
  const styles = useMemo(() => createStyles(theme, bottomInset), [theme, bottomInset]);
  const selected =
    group.customers.find((customer) => customer.id === selectedCustomerId) ?? group.customers[0];
  const isGroup = group.count > 1;

  if (!selected) {
    return null;
  }

  return (
    <View style={styles.panel} accessibilityLabel="선택된 고객 정보">
      {isGroup ? (
        <>
          <View style={styles.groupHeader}>
            <AppText variant="bodyStrong">{buildGroupSelectionTitle(group.customers, group.count)}</AppText>
            <AppText variant="caption" color="textSecondary">{group.count}명 · 동일 위치</AppText>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.groupPicker}
            keyboardShouldPersistTaps="handled"
          >
            {group.customers.map((customer) => {
              const active = customer.id === selectedCustomerId;
              return (
                <Pressable
                  key={customer.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${customer.name} 선택`}
                  onPress={() => onSelectCustomer(customer.id)}
                  style={[styles.groupChip, active && styles.groupChipActive]}
                >
                  <AppText variant="body" numberOfLines={1}>
                    {customer.isFavorite ? '★ ' : ''}
                    {customer.name || '이름 없음'}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
          <CustomerMapInfoPanel
            customer={selected}
            onOpenDetail={onOpenDetail}
            styles={styles}
            theme={theme}
          />
        </>
      ) : (
        <CustomerMapInfoPanel
          customer={selected}
          onOpenDetail={onOpenDetail}
          styles={styles}
          theme={theme}
        />
      )}
    </View>
  );
}

function createStyles(theme: AppTheme, bottomInset: number) {
  return StyleSheet.create({
    panel: {
      width: '100%',
      backgroundColor: theme.colors.surface,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      paddingTop: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: Math.max(theme.spacing.md, bottomInset),
      gap: theme.spacing.sm,
    },
    groupHeader: {
      gap: theme.spacing.xxs,
    },
    groupPicker: {
      gap: theme.spacing.sm,
      paddingBottom: theme.spacing.xs,
    },
    groupChip: {
      borderRadius: theme.radius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      maxWidth: 180,
      backgroundColor: theme.colors.background,
    },
    groupChipActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.primarySoft,
    },
    infoBody: {
      gap: theme.spacing.sm,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: theme.spacing.sm,
    },
    nameRow: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    nameText: {
      flexShrink: 1,
    },
    genderText: {
      flexShrink: 0,
    },
    detailAction: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    phoneActions: {
      flexDirection: 'row',
      alignItems: 'center',
      flexShrink: 0,
      marginRight: -theme.spacing.xxs,
    },
    infoLabel: {
      width: 72,
      flexShrink: 0,
    },
    infoValue: {
      flex: 1,
    },
    addressBlock: {
      gap: theme.spacing.xxs,
    },
    addressValue: {
      paddingLeft: 0,
    },
  });
}
