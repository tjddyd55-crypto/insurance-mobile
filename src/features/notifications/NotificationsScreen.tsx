import { useEffect, useMemo, useState } from 'react';
import { RefreshControl, SectionList, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Badge,
  Button,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { NotificationCard } from './NotificationCard';
import { groupNotifications, NOTIFICATION_PANEL_PREVIEW_COUNT } from './notificationModel';
import { notificationEmptyCopy, notificationSectionTone } from './notificationPresentation';
import {
  confirmNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi';
import { notificationQueryKeys } from './queryKeys';
import type { NotificationRecord, NotificationType, NotificationView } from './types';

type NotificationSection = {
  type: NotificationType;
  title: string;
  dateLabel: string;
  totalCount: number;
  data: NotificationRecord[];
};

export function NotificationsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [view, setView] = useState<NotificationView>('active');
  const [confirmTarget, setConfirmTarget] = useState<NotificationRecord | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const query = useQuery({
    queryKey: notificationQueryKeys.list(view),
    queryFn: () => listNotifications(token, view),
    enabled: Boolean(token),
  });
  const grouped = useMemo(
    () => groupNotifications(query.data?.notifications ?? []),
    [query.data?.notifications],
  );
  const sections = useMemo<NotificationSection[]>(() => {
    if (query.isLoading || query.isError) return [];
    return grouped.map((section) => {
      const expanded = expandedSections.has(section.type);
      return {
        ...section,
        totalCount: section.data.length,
        data: expanded ? section.data : section.data.slice(0, NOTIFICATION_PANEL_PREVIEW_COUNT),
      };
    });
  }, [expandedSections, grouped, query.isError, query.isLoading]);

  useEffect(() => {
    setExpandedSections(new Set());
  }, [view]);
  const unreadCount = (query.data?.notifications ?? []).filter((item) => !item.isRead).length;
  const confirmMutation = useMutation({
    mutationFn: (notification: NotificationRecord) => confirmNotification(token, notification.id),
    onSuccess: async () => {
      setConfirmTarget(null);
      await queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all });
    },
  });
  const readMutation = useMutation({
    mutationFn: (notification: NotificationRecord) => markNotificationRead(token, notification.id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
  });
  const readAllMutation = useMutation({
    mutationFn: () => markAllNotificationsRead(token),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationQueryKeys.all }),
  });

  const openNotification = (notification: NotificationRecord) => {
    if (notification.customerId == null || notification.customerId < 1) return;
    if (!notification.isRead) readMutation.mutate(notification);
    if (notification.type === 'claim_request_received' && notification.claimRequestId != null) {
      router.push({
        pathname: '/customers/[customerId]/claim-requests',
        params: {
          customerId: String(notification.customerId),
          claimId: String(notification.claimRequestId),
        },
      });
      return;
    }
    if (notification.type === 'customer_created') {
      router.push({
        pathname: '/customers/[customerId]',
        params: { customerId: String(notification.customerId) },
      });
      return;
    }
    router.push({
      pathname: '/customers/[customerId]/consultations',
      params: { customerId: String(notification.customerId) },
    });
  };

  const actionError = confirmMutation.error ?? readMutation.error ?? readAllMutation.error;

  return (
    <View style={styles.root}>
      <AppHeader title="알림" />
      <Screen padded={false}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Stack gap="sm" style={styles.header}>
              <Inline justify="space-between" wrap>
                <Inline>
                  <Button
                    label="미확인"
                    size="sm"
                    variant={view === 'active' ? 'selected' : 'secondary'}
                    onPress={() => setView('active')}
                  />
                  <Button
                    label="확인한 알림"
                    size="sm"
                    variant={view === 'confirmed' ? 'selected' : 'secondary'}
                    onPress={() => setView('confirmed')}
                  />
                </Inline>
                <Button
                  label="알림 설정"
                  size="sm"
                  variant="secondary"
                  onPress={() => router.push('/notifications/settings')}
                />
              </Inline>

              {view === 'confirmed' ? (
                <AppText variant="caption">최근 1개월 내 확인한 알림만 표시됩니다.</AppText>
              ) : (
                <Inline justify="space-between">
                  <Inline>
                    <AppText variant="caption">읽지 않음</AppText>
                    <Badge label={`${unreadCount}개`} tone={unreadCount ? 'warning' : 'default'} />
                  </Inline>
                  <Button
                    label="모두 읽음"
                    size="sm"
                    variant="ghost"
                    disabled={unreadCount === 0}
                    loading={readAllMutation.isPending}
                    onPress={() => readAllMutation.mutate()}
                  />
                </Inline>
              )}

              {actionError ? (
                <AppText color="danger">
                  {actionError instanceof Error ? actionError.message : '알림 요청을 처리하지 못했습니다.'}
                </AppText>
              ) : null}
            </Stack>
          }
          renderSectionHeader={({ section }) => (
            <View
              style={[
                styles.sectionBanner,
                { backgroundColor: bannerColor(theme, notificationSectionTone(section.type)) },
              ]}
            >
              <Inline>
                <AppText variant="bodyStrong">{section.title}</AppText>
                <Badge label={`${section.totalCount}`} tone={notificationSectionTone(section.type)} />
              </Inline>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.sectionBody}>
              <NotificationCard
                notification={item}
                view={view}
                busy={confirmMutation.isPending && confirmMutation.variables?.id === item.id}
                onOpen={openNotification}
                onConfirm={setConfirmTarget}
              />
            </View>
          )}
          renderSectionFooter={({ section }) => {
            const hiddenCount = Math.max(0, section.totalCount - NOTIFICATION_PANEL_PREVIEW_COUNT);
            const expanded = expandedSections.has(section.type);
            return (
              <View style={styles.sectionFooter}>
                {section.totalCount === 0 ? (
                  <AppText variant="caption" color="textMuted" style={styles.sectionEmpty}>
                    {notificationEmptyCopy()}
                  </AppText>
                ) : null}
                {section.totalCount > NOTIFICATION_PANEL_PREVIEW_COUNT ? (
                  <Button
                    label={expanded ? '접기' : `더보기 ${hiddenCount}개`}
                    size="sm"
                    variant="secondary"
                    onPress={() =>
                      setExpandedSections((previous) => {
                        const next = new Set(previous);
                        if (next.has(section.type)) next.delete(section.type);
                        else next.add(section.type);
                        return next;
                      })
                    }
                  />
                ) : null}
              </View>
            );
          }}
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingState compact message="알림을 불러오는 중…" />
            ) : query.isError ? (
              <ErrorState
                compact
                title="알림을 불러오지 못했습니다"
                message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
                onRetry={() => void query.refetch()}
              />
            ) : null
          }
          SectionSeparatorComponent={() => <View style={styles.sectionGap} />}
        />
      </Screen>

      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="알림 확인"
        message="이 알림을 확인 처리하면 미확인 목록에서 사라집니다. 계속하시겠습니까?"
        confirmLabel="확인 처리"
        busy={confirmMutation.isPending}
        onCancel={() => setConfirmTarget(null)}
        onConfirm={() => {
          if (confirmTarget) confirmMutation.mutate(confirmTarget);
        }}
      />
    </View>
  );
}

function bannerColor(theme: AppTheme, tone: 'default' | 'success' | 'warning' | 'danger' | 'info') {
  if (tone === 'success') return theme.colors.successSoft;
  if (tone === 'info') return theme.colors.infoSoft;
  if (tone === 'warning') return theme.colors.warningSoft;
  if (tone === 'danger') return theme.colors.dangerSoft;
  return theme.colors.surfaceSubtle;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    list: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
    },
    header: { marginBottom: theme.spacing.md },
    sectionBanner: {
      minHeight: theme.interaction.minimumTouchTarget,
      paddingHorizontal: theme.spacing.md,
      justifyContent: 'center',
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: theme.colors.border,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
    },
    sectionBody: {
      backgroundColor: theme.colors.surface,
      borderLeftWidth: 1,
      borderRightWidth: 1,
      borderColor: theme.colors.border,
    },
    sectionFooter: {
      borderWidth: 1,
      borderTopWidth: 0,
      borderColor: theme.colors.border,
      borderBottomLeftRadius: theme.radius.lg,
      borderBottomRightRadius: theme.radius.lg,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      marginBottom: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    sectionEmpty: { paddingVertical: theme.spacing.sm },
    sectionGap: { height: theme.layout.compactListGap },
  });
}
