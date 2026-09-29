import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import {
  AppText,
  Badge,
  Button,
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
import { notificationSectionDateLabel } from './notificationPresentation';
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
  const unread = !notification.isRead && view === 'active';

  return (
    <View style={[styles.row, unread && styles.unread]}>
      <Pressable
        accessibilityRole={canOpen ? 'link' : undefined}
        disabled={!canOpen}
        onPress={() => onOpen(notification)}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <Stack gap="xs">
          <Inline justify="space-between" align="flex-start">
            <AppText
              variant="bodyStrong"
              color={canOpen ? 'info' : 'text'}
              numberOfLines={1}
              style={styles.title}
            >
              {notification.customerName || '고객 정보 없음'}
            </AppText>
            {unread ? <Badge label="새 알림" tone="warning" /> : null}
          </Inline>
          {notification.message ? (
            <AppText variant="caption" color="textSecondary" numberOfLines={2}>
              {notification.message}
            </AppText>
          ) : null}
          <Inline gap="sm" wrap>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {notificationSectionDateLabel(notification.type)} {referenceDate ?? '—'}
            </AppText>
            <Badge label={notificationDDay(referenceDate, todayInSeoul())} tone="info" />
          </Inline>
        </Stack>
      </Pressable>
      {view === 'active' ? (
        <Button
          label="확인"
          variant="ghost"
          size="sm"
          loading={busy}
          onPress={() => onConfirm(notification)}
          style={styles.confirm}
        />
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    unread: {
      backgroundColor: theme.colors.infoSoft,
    },
    body: {
      minHeight: theme.interaction.minimumTouchTarget,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    pressed: { backgroundColor: theme.colors.surfaceSubtle, opacity: theme.opacity.pressed },
    title: { flex: 1, minWidth: 0, paddingRight: theme.spacing.sm },
    confirm: { alignSelf: 'stretch', marginHorizontal: theme.spacing.xs, marginBottom: theme.spacing.xs },
  });
}
