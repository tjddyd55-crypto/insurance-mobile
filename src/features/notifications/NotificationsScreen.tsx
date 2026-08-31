import { useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
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
  Card,
  Inline,
  Screen,
  Stack,
  useAppTheme,
} from '../../design-system';
import { NotificationCard } from './NotificationCard';
import { groupNotifications } from './notificationModel';
import {
  confirmNotification,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notificationsApi';
import { notificationQueryKeys } from './queryKeys';
import type { NotificationRecord, NotificationView } from './types';

export function NotificationsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const [view, setView] = useState<NotificationView>('active');
  const [confirmTarget, setConfirmTarget] = useState<NotificationRecord | null>(null);
  const query = useQuery({
    queryKey: notificationQueryKeys.list(view),
    queryFn: () => listNotifications(token, view),
    enabled: Boolean(token),
  });
  const sections = useMemo(
    () => groupNotifications(query.data?.notifications ?? []),
    [query.data?.notifications],
  );
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
        <ScrollView
          contentContainerStyle={[styles.content, { padding: theme.spacing.lg }]}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Inline justify="space-between" wrap>
            <Inline>
              <Button
                label="미확인"
                size="sm"
                variant={view === 'active' ? 'primary' : 'secondary'}
                onPress={() => setView('active')}
              />
              <Button
                label="확인한 알림"
                size="sm"
                variant={view === 'confirmed' ? 'primary' : 'secondary'}
                onPress={() => setView('confirmed')}
              />
            </Inline>
            <Button label="알림 설정" size="sm" variant="secondary" onPress={() => router.push('/notifications/settings')} />
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

          {query.isLoading ? <LoadingState message="알림을 불러오는 중…" /> : null}
          {query.isError ? (
            <ErrorState
              title="알림을 불러오지 못했습니다"
              message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
              onRetry={() => void query.refetch()}
            />
          ) : null}
          {actionError ? (
            <AppText color="danger">
              {actionError instanceof Error ? actionError.message : '알림 요청을 처리하지 못했습니다.'}
            </AppText>
          ) : null}

          {!query.isLoading && !query.isError ? sections.map((section) => (
            <Card key={section.type} variant="outlined">
              <Stack gap="md">
                <Inline justify="space-between">
                  <AppText variant="heading">{section.title}</AppText>
                  <Badge label={`${section.data.length}개`} tone="info" />
                </Inline>
                {section.data.length ? section.data.map((notification) => (
                  <NotificationCard
                    key={notification.id}
                    notification={notification}
                    view={view}
                    busy={confirmMutation.isPending && confirmMutation.variables?.id === notification.id}
                    onOpen={openNotification}
                    onConfirm={setConfirmTarget}
                  />
                )) : (
                  <AppText variant="caption" color="textMuted">표시할 알림이 없습니다.</AppText>
                )}
              </Stack>
            </Card>
          )) : null}
        </ScrollView>
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flexGrow: 1, gap: 12, paddingBottom: 32 },
});
