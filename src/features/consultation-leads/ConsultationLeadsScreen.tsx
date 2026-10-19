import { useMemo } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { describeApiError } from '../../api/apiErrorCopy';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Badge, Inline, Stack, useAppTheme, type AppTheme } from '../../design-system';
import {
  consultationChannelLabel,
  consultationLeadStatusLabel,
  formatLeadDateTime,
  formatLeadPhone,
  leadMessagePreview,
} from './consultationLeadModel';
import { listConsultationLeads } from './consultationLeadsApi';
import { consultationLeadQueryKeys } from './queryKeys';
import type { ConsultationLead } from './types';

export function leadStatusTone(status: ConsultationLead['status']) {
  if (status === 'new') return 'warning' as const;
  if (status === 'checked') return 'info' as const;
  return 'success' as const;
}

/** 상담 신청 관리(모바일 명함으로 들어온 신청만). 고객을 자동으로 만들지 않는다. */
export function ConsultationLeadsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const query = useQuery({
    queryKey: consultationLeadQueryKeys.list(),
    queryFn: () => listConsultationLeads(token),
    enabled: Boolean(token),
  });
  const items = query.data?.items ?? [];
  const newCount = query.data?.newCount ?? 0;

  return (
    <View style={styles.root}>
      <AppHeader title="상담 신청" />
      {query.isLoading ? (
        <LoadingState message="상담 신청을 불러오는 중…" />
      ) : query.isError ? (
        <ErrorState
          title="상담 신청을 불러오지 못했습니다"
          message={describeApiError(query.error, '잠시 후 다시 시도해 주세요.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
          ListHeaderComponent={
            <Stack gap="xs" style={styles.intro}>
              <AppText variant="sectionTitle">상담 신청</AppText>
              <AppText variant="caption" color="textSecondary">
                모바일 명함을 통해 접수된 상담 신청만 표시됩니다.{newCount > 0 ? ` 신규 ${newCount}건` : ''}
              </AppText>
            </Stack>
          }
          ListEmptyComponent={<EmptyState title="접수된 상담 신청이 없습니다." message="모바일 명함에서 상담 신청이 오면 여기에 표시됩니다." />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${item.visitorName} 상담 신청 ${consultationLeadStatusLabel(item.status)}`}
              onPress={() => router.push({ pathname: '/consultation-leads/[leadId]', params: { leadId: item.id } })}
              style={({ pressed }) => [styles.card, item.status === 'new' && styles.cardNew, pressed && styles.pressed]}
            >
              <Inline justify="space-between">
                <Badge label={consultationLeadStatusLabel(item.status)} tone={leadStatusTone(item.status)} />
                <AppText variant="caption" color="textMuted">{formatLeadDateTime(item.createdAt)}</AppText>
              </Inline>
              <AppText variant="bodyStrong" numberOfLines={1}>{item.visitorName || '이름 없음'}</AppText>
              <AppText variant="body" color="textSecondary">{formatLeadPhone(item)}</AppText>
              {item.message ? (
                <AppText variant="caption" color="textSecondary" numberOfLines={2}>{leadMessagePreview(item.message)}</AppText>
              ) : null}
              <AppText variant="caption" color="textMuted">연락 희망 · {consultationChannelLabel(item.contactChannel)}</AppText>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    list: { padding: theme.layout.screenPaddingHorizontal, gap: theme.spacing.sm, flexGrow: 1 },
    intro: { paddingBottom: theme.spacing.sm },
    card: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    cardNew: { borderColor: theme.colors.warning, backgroundColor: theme.colors.warningSoft },
    pressed: { opacity: 0.85 },
  });
}
