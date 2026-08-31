import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

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
import {
  notificationDDay,
  notificationReferenceDate,
  todayInSeoul,
} from './notificationModel';
import type { NotificationRecord, NotificationView } from './types';

export function NotificationCard({
  notification,
  view,
  busy,
  onOpen,
  onConfirm,
}: {
  notification: NotificationRecord;
  view: NotificationView;
  busy: boolean;
  onOpen: (notification: NotificationRecord) => void;
  onConfirm: (notification: NotificationRecord) => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const referenceDate = notificationReferenceDate(notification);
  const canOpen = notification.customerId != null && notification.customerId > 0;

  return (
    <Card variant="outlined" padding="none">
      <Pressable
        accessibilityRole={canOpen ? 'link' : undefined}
        disabled={!canOpen}
        onPress={() => onOpen(notification)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Stack gap="sm">
          <Inline justify="space-between" align="flex-start">
            <View style={styles.titleWrap}>
              <AppText variant="bodyStrong" color={canOpen ? 'info' : 'text'}>
                {notification.customerName || '고객 정보 없음'}
              </AppText>
              {notification.message ? (
                <AppText variant="caption" color="textSecondary" numberOfLines={3}>
                  {notification.message}
                </AppText>
              ) : null}
            </View>
            {!notification.isRead && view === 'active' ? <Badge label="새 알림" tone="warning" /> : null}
          </Inline>
          <Inline gap="md" wrap>
            <AppText variant="caption">기준일 {referenceDate ?? '—'}</AppText>
            <Badge label={notificationDDay(referenceDate, todayInSeoul())} tone="info" />
          </Inline>
        </Stack>
      </Pressable>
      {view === 'active' ? (
        <View style={styles.actions}>
          <Button
            label="확인 처리"
            variant="ghost"
            size="sm"
            loading={busy}
            onPress={() => onConfirm(notification)}
            style={styles.action}
          />
        </View>
      ) : null}
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: { padding: theme.spacing.lg },
    pressed: { backgroundColor: theme.colors.surfaceSubtle, opacity: theme.opacity.pressed },
    titleWrap: { flex: 1, gap: theme.spacing.xs },
    actions: {
      flexDirection: 'row',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      padding: theme.spacing.xs,
    },
    action: { flex: 1 },
  });
}
