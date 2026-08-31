import { useMemo } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { customerGenderLabel, formatCustomerPhone } from './customerModel';
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
  const lastConsultation = customer.lastConsultationMemo ?? customer.lastConsultationSummary;

  return (
    <Card variant="outlined" padding="none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${customer.name} 고객 상세 보기`}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
        onPress={() =>
          router.push({
            pathname: '/customers/[customerId]',
            params: { customerId: String(customer.id) },
          })
        }
      >
        <Stack gap="sm">
          <Inline justify="space-between" align="flex-start">
            <View style={styles.nameWrap}>
              <Inline gap="sm" wrap>
                <AppText variant="subheading">{customer.name}</AppText>
                {customer.customerCode ? <Badge label={customer.customerCode} /> : null}
                {customer.isFavorite ? <Badge label="중요" tone="warning" /> : null}
              </Inline>
              <AppText variant="caption">
                {customerGenderLabel(customer.gender)}
                {customer.insuranceAge != null ? ` · 보험나이 ${customer.insuranceAge}세` : ''}
              </AppText>
            </View>
            <AppText variant="heading" color="textMuted" accessibilityElementsHidden>
              ›
            </AppText>
          </Inline>

          {customer.phone ? (
            <AppText variant="bodyStrong">{formatCustomerPhone(customer.phone)}</AppText>
          ) : (
            <AppText variant="caption" color="textMuted">연락처 없음</AppText>
          )}

          {lastConsultation ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              최근 상담 · {lastConsultation}
            </AppText>
          ) : null}

          {customer.nextContactDate ? (
            <Badge
              label={`다음 연락 ${customer.nextContactDate.slice(0, 10)}`}
              tone={customer.overdueFollowUp ? 'danger' : customer.todayFollowUp ? 'warning' : 'info'}
            />
          ) : null}
        </Stack>
      </Pressable>

      <View style={styles.actions}>
        <Button
          label={customer.isFavorite ? '중요 해제' : '중요 고객'}
          variant="ghost"
          size="sm"
          loading={favoriteBusy}
          onPress={() => onToggleFavorite(customer)}
          style={styles.action}
        />
        <Button
          label="문자"
          variant="ghost"
          size="sm"
          disabled={!smsUrl || customer.smsOptOut}
          onPress={() => smsUrl && void Linking.openURL(smsUrl)}
          style={styles.action}
        />
        <Button
          label="전화"
          variant="ghost"
          size="sm"
          disabled={!telUrl}
          onPress={() => telUrl && void Linking.openURL(telUrl)}
          style={styles.action}
        />
      </View>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    summary: { padding: theme.spacing.lg },
    pressed: { opacity: theme.opacity.pressed, backgroundColor: theme.colors.surfaceSubtle },
    nameWrap: { flex: 1, gap: theme.spacing.xs },
    actions: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
    },
    action: { flex: 1 },
  });
}
