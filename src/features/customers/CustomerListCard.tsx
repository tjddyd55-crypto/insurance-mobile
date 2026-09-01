import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppText,
  Button,
  Badge,
  Card,
  IconButton,
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
  const [expanded, setExpanded] = useState(false);
  const telUrl = phoneUrl(customer.phone, 'tel');
  const smsUrl = phoneUrl(customer.phone, 'sms');
  const lastConsultation = customer.lastConsultationMemo ?? customer.lastConsultationSummary;

  return (
    <Card
      variant="outlined"
      padding="none"
      style={expanded && styles.selectedCard}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${customer.name} 고객 카드 ${expanded ? '접기' : '펼치기'}`}
        accessibilityState={{ expanded }}
        style={({ pressed }) => [styles.summary, pressed && styles.pressed]}
        onPress={() => setExpanded((value) => !value)}
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
                {customer.insuranceAge != null ? `보험나이 ${customer.insuranceAge}세` : '보험나이 —'}
              </AppText>
            </View>
            <AppText variant="bodyStrong" numberOfLines={1}>
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
              onPress={(event) => {
                event.stopPropagation();
                onToggleFavorite(customer);
              }}
              icon={(color) => (
                <AppText
                  accessibilityElementsHidden
                  style={[styles.actionIcon, { color: customer.isFavorite ? theme.colors.warning : color }]}
                >
                  {customer.isFavorite ? '★' : '☆'}
                </AppText>
              )}
            />
            <IconButton
              accessibilityLabel={customer.smsOptOut ? '문자 수신 거부 고객' : '문자 보내기'}
              variant="ghost"
              disabled={!smsUrl || customer.smsOptOut}
              onPress={(event) => {
                event.stopPropagation();
                if (smsUrl) void Linking.openURL(smsUrl);
              }}
              icon={(color) => (
                <AppText accessibilityElementsHidden style={[styles.actionIcon, { color }]}>✉</AppText>
              )}
            />
            <IconButton
              accessibilityLabel="전화 걸기"
              variant="ghost"
              tone="primary"
              disabled={!telUrl}
              onPress={(event) => {
                event.stopPropagation();
                if (telUrl) void Linking.openURL(telUrl);
              }}
              icon={(color) => (
                <AppText accessibilityElementsHidden style={[styles.actionIcon, { color }]}>☎</AppText>
              )}
            />
            <IconButton
              accessibilityLabel={expanded ? '고객 카드 접기' : '고객 카드 펼치기'}
              variant="ghost"
              tone="primary"
              onPress={(event) => {
                event.stopPropagation();
                setExpanded((value) => !value);
              }}
              icon={(color) => (
                <AppText accessibilityElementsHidden style={[styles.expandIcon, { color }]}>
                  {expanded ? '▲' : '▼'}
                </AppText>
              )}
            />
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <View style={styles.expanded}>
          <Stack gap="sm">
            <View style={styles.badges}>
              {customer.customerCode ? <Badge label={customer.customerCode} /> : null}
              {customer.nextContactDate ? (
                <Badge
                  label={`다음 연락 ${customer.nextContactDate.slice(0, 10)}`}
                  tone={customer.overdueFollowUp ? 'danger' : customer.todayFollowUp ? 'warning' : 'info'}
                />
              ) : null}
            </View>
            {customer.job ? (
              <AppText variant="helper" color="textSecondary" numberOfLines={1}>
                직업 · {customer.job}
              </AppText>
            ) : null}
            {customer.address ? (
              <AppText variant="helper" color="textSecondary" numberOfLines={1}>
                주소 · {customer.address}
              </AppText>
            ) : null}
            {lastConsultation ? (
              <AppText variant="helper" color="textSecondary" numberOfLines={2}>
                최근 상담 · {lastConsultation}
              </AppText>
            ) : null}
            <Button
              label="고객 상세"
              size="sm"
              variant="secondary"
              onPress={() =>
                router.push({
                  pathname: '/customers/[customerId]',
                  params: { customerId: String(customer.id) },
                })
              }
            />
          </Stack>
        </View>
      ) : null}
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    selectedCard: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
      backgroundColor: theme.colors.surface,
    },
    summary: { padding: theme.spacing.md },
    pressed: { opacity: theme.opacity.pressed, backgroundColor: theme.colors.surfaceSubtle },
    summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: theme.spacing.xs },
    summaryContent: { flex: 1, minWidth: 0 },
    nameRow: {
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: theme.spacing.sm,
    },
    name: { flexShrink: 1, minWidth: 0 },
    actions: { flexDirection: 'row', marginTop: -theme.spacing.xs, marginRight: -theme.spacing.sm },
    actionIcon: { fontSize: 18, lineHeight: 22 },
    expandIcon: { fontSize: 13, lineHeight: 18 },
    expanded: {
      paddingHorizontal: theme.spacing.md,
      paddingBottom: theme.spacing.md,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
    },
    badges: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs },
  });
}
