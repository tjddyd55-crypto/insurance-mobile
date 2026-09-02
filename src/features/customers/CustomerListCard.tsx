import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import {
  AppText,
  Card,
  IconButton,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { customerGenderLabel, formatCustomerPhone } from './customerModel';
import { customerDetailPath } from './customerWorkspaceNavigation';
import type { CustomerRecord } from './types';

type CustomerListCardProps = {
  customer: CustomerRecord;
  favoriteBusy?: boolean;
  onToggleFavorite: (customer: CustomerRecord) => void;
};

function phoneUrl(phone: string, scheme: 'tel' | 'sms'): string | null {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 8 ? `${scheme}:${digits}` : null;
}

export function CustomerListCard({
  customer,
  favoriteBusy = false,
  onToggleFavorite,
}: CustomerListCardProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const telUrl = phoneUrl(customer.phone, 'tel');
  const smsUrl = phoneUrl(customer.phone, 'sms');

  return (
    <Card variant="outlined" padding="none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${customer.name} 고객 상세 보기`}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
        onPress={() =>
          router.push(customerDetailPath(customer.id) as Href)
        }
      >
        <View style={styles.summaryRow}>
          <Stack gap="xs" style={styles.summaryContent}>
            <View style={styles.nameRow}>
              <AppText variant="cardTitle" numberOfLines={1} style={styles.name}>
                {customer.name}
              </AppText>
              <AppText variant="helper" color="textMuted">
                {customerGenderLabel(customer.gender)}
              </AppText>
              <AppText variant="helper" color="textMuted" numberOfLines={1}>
                {customer.insuranceAge != null
                  ? `보험나이 ${customer.insuranceAge}세`
                  : '보험나이 —'}
              </AppText>
            </View>
            <AppText variant="body" color="textSecondary" numberOfLines={1}>
              {customer.phone ? formatCustomerPhone(customer.phone) : '연락처 없음'}
            </AppText>
            <AppText variant="helper" color="textSecondary" numberOfLines={1}>
              상령일: {customer.nextAgeDate?.slice(0, 10) || '—'}
            </AppText>
          </Stack>

          <View style={styles.actions}>
            <IconButton
              accessibilityLabel={customer.isFavorite ? '중요 고객 해제' : '중요 고객'}
              variant="ghost"
              disabled={favoriteBusy}
              hitSlop={styles.actionHitSlop}
              style={styles.actionButton}
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite(customer);
              }}
              icon={(color) => (
                <AppText
                  accessibilityElementsHidden
                  style={[
                    styles.actionIcon,
                    { color: customer.isFavorite ? theme.colors.warning : color },
                  ]}
                >
                  {customer.isFavorite ? '★' : '☆'}
                </AppText>
              )}
            />
            <IconButton
              accessibilityLabel={
                customer.smsOptOut ? '문자 수신 거부 고객' : '문자 보내기'
              }
              variant="ghost"
              disabled={!smsUrl || customer.smsOptOut}
              hitSlop={styles.actionHitSlop}
              style={styles.actionButton}
              onPress={(event) => {
                event.stopPropagation();
                if (smsUrl) void Linking.openURL(smsUrl);
              }}
              icon={(color) => (
                <AppText
                  accessibilityElementsHidden
                  style={[styles.actionIcon, { color }]}
                >
                  ✉
                </AppText>
              )}
            />
            <IconButton
              accessibilityLabel="전화 걸기"
              variant="ghost"
              tone="primary"
              disabled={!telUrl}
              hitSlop={styles.actionHitSlop}
              style={styles.actionButton}
              onPress={(event) => {
                event.stopPropagation();
                if (telUrl) void Linking.openURL(telUrl);
              }}
              icon={(color) => (
                <AppText
                  accessibilityElementsHidden
                  style={[styles.actionIcon, { color }]}
                >
                  ☎
                </AppText>
              )}
            />
          </View>
        </View>
      </Pressable>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  const actionHitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
  const styles = StyleSheet.create({
    summary: {
      paddingHorizontal: theme.spacing.sm + theme.spacing.xxs,
      paddingVertical: theme.spacing.sm + theme.spacing.xxs,
    },
    pressed: {
      opacity: theme.opacity.pressed,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
    summaryContent: { flex: 1, minWidth: 0 },
    nameRow: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
    },
    name: { flexShrink: 1, minWidth: 0 },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xxs + 2,
      marginRight: -(theme.spacing.xxs + 2),
    },
    actionButton: {
      width: 28,
      height: 28,
    },
    actionIcon: { fontSize: 16, lineHeight: 18 },
  });
  return { ...styles, actionHitSlop };
}
