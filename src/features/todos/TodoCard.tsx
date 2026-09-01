import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import {
  AppText,
  Card,
  Inline,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { todoDisplayContent } from './todoModel';
import {
  formatTodoCreatedDate,
  formatTodoDueLine,
  todoRelatedDisplay,
  todoSourceLine,
} from './todoPresentation';
import type { TodoRecord } from './types';

export function TodoCard({
  todo,
  stateBusy,
  onToggleDone,
}: {
  todo: TodoRecord;
  stateBusy: boolean;
  onToggleDone: (todo: TodoRecord) => void;
}) {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const done = todo.status === 'completed';
  const canceled = todo.status === 'canceled';
  const related = todoRelatedDisplay(todo);

  return (
    <Card variant="outlined" padding="sm">
      <Inline align="flex-start" gap="sm">
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: done, disabled: canceled || stateBusy }}
          accessibilityLabel={done ? '다시 열기' : '완료 처리'}
          disabled={canceled || stateBusy}
          hitSlop={theme.interaction.compactHitSlop}
          onPress={() => onToggleDone(todo)}
          style={styles.checkHit}
        >
          <View style={[styles.checkbox, done && styles.checkboxDone, canceled && styles.checkboxDisabled]}>
            {done ? (
              <AppText variant="caption" style={{ color: theme.colors.onPrimary }}>✓</AppText>
            ) : null}
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${todoDisplayContent(todo)} 할 일 수정`}
          style={({ pressed }) => [styles.body, pressed && styles.pressed]}
          onPress={() =>
            router.push({ pathname: '/todos/[todoId]/edit', params: { todoId: todo.id } })
          }
        >
          <Stack gap="xs">
            <AppText variant="bodyStrong" color="info" numberOfLines={3}>
              {todoDisplayContent(todo)}
            </AppText>
            {related.customerId ? (
              <Pressable
                accessibilityRole="link"
                onPress={(event) => {
                  event.stopPropagation();
                  router.push({
                    pathname: '/customers/[customerId]',
                    params: { customerId: related.customerId ?? '' },
                  });
                }}
              >
                <AppText variant="caption" color="info" numberOfLines={1}>
                  연결: {related.label}
                </AppText>
              </Pressable>
            ) : (
              <AppText variant="caption" color="textMuted" numberOfLines={1}>
                연결: {related.label}
              </AppText>
            )}
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              작성일 {formatTodoCreatedDate(todo.createdAt)}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {formatTodoDueLine(todo)}
            </AppText>
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {todoSourceLine(todo)}
            </AppText>
          </Stack>
        </Pressable>
      </Inline>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    checkHit: {
      width: theme.interaction.minimumTouchTarget,
      height: theme.interaction.minimumTouchTarget,
      alignItems: 'center',
      justifyContent: 'center',
      margin: -theme.spacing.sm,
    },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: theme.radius.xs,
      borderWidth: 1,
      borderColor: theme.colors.borderStrong,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxDone: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkboxDisabled: {
      opacity: theme.opacity.disabled,
    },
    body: { flex: 1, minWidth: 0 },
    pressed: { opacity: theme.opacity.pressed },
  });
}
