import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import {
  AppText,
  Card,
  fontWeight,
  lineHeight,
  typeScale,
  Inline,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { todoDisplayContent } from './todoModel';
import { todoEditPath } from './todoNavigation';
import { customerTodoDateLine } from './customerTodos';
import {
  formatTodoDueLine,
  todoRelatedDisplay,
  todoSourceLine,
} from './todoPresentation';
import type { TodoRecord } from './types';

export function TodoCard({
  todo,
  stateBusy,
  onToggleDone,
  editHref,
  dateOnly = false,
}: {
  todo: TodoRecord;
  stateBusy: boolean;
  onToggleDone: (todo: TodoRecord) => void;
  /** 없으면 기존 할 일 수정 경로. */
  editHref?: Href;
  /** 고객 할 일 화면: 연결·출처 줄 없이 `날짜 …`만 보인다. */
  dateOnly?: boolean;
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
          accessibilityLabel={`${todoDisplayContent(todo)} 할 일 열기`}
          style={({ pressed }) => [styles.body, pressed && styles.pressed]}
          onPress={() => router.push(editHref ?? (todoEditPath(todo.id) as Href))}
        >
          <Stack gap="xs">
            <AppText variant="bodyStrong" color="info" numberOfLines={3}>
              {todoDisplayContent(todo)}
            </AppText>
            {dateOnly ? (
              <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.meta}>
                {customerTodoDateLine(todo)}
              </AppText>
            ) : null}
            {dateOnly ? null : (
              <AppText variant="caption" color={related.customerId ? 'textSecondary' : 'textMuted'} numberOfLines={1} style={styles.meta}>
                연결: {related.label}
              </AppText>
            )}
            {dateOnly ? null : (
              <>
                <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.meta}>
                  {formatTodoDueLine(todo)}
                </AppText>
                <AppText variant="caption" color="textSecondary" numberOfLines={1} style={styles.meta}>
                  {todoSourceLine(todo)}
                </AppText>
              </>
            )}
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
    // 카드 메타(연결·날짜·출처)는 공용 12px caption 대신 14px 보통 굵기
    meta: { fontSize: typeScale.label, lineHeight: lineHeight.label, fontWeight: fontWeight.regular },
    pressed: { opacity: theme.opacity.pressed },
  });
}
