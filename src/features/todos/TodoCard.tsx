import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { formatTodoDate, todoDisplayContent, todoSourceLabel, todoStatusLabel } from './todoModel';
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

  return (
    <Card variant="outlined" padding="none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${todoDisplayContent(todo)} 할 일 수정`}
        style={({ pressed }) => [styles.content, pressed && styles.pressed]}
        onPress={() =>
          router.push({ pathname: '/todos/[todoId]/edit', params: { todoId: todo.id } })
        }
      >
        <Stack gap="sm">
          <Inline gap="sm" wrap>
            <Badge
              label={todoStatusLabel(todo.status)}
              tone={done ? 'success' : todo.status === 'canceled' ? 'danger' : 'warning'}
            />
            <Badge label={todoSourceLabel(todo.sourceType)} tone="info" />
            {todo.priority === 'high' ? <Badge label="중요" tone="danger" /> : null}
          </Inline>
          <AppText
            variant="bodyStrong"
            color={done ? 'textMuted' : 'text'}
            style={done ? styles.doneText : undefined}
            numberOfLines={4}
          >
            {todoDisplayContent(todo)}
          </AppText>
          <AppText variant="caption">
            마감 {formatTodoDate(todo.dueDate)}
          </AppText>
          {todo.relatedEntityType === 'customer' && todo.relatedEntityId ? (
            <Pressable
              accessibilityRole="link"
              onPress={(event) => {
                event.stopPropagation();
                router.push({
                  pathname: '/customers/[customerId]',
                  params: { customerId: todo.relatedEntityId ?? '' },
                });
              }}
            >
              <AppText variant="caption" color="info">
                연결 고객 · {todo.customerName || `고객 #${todo.relatedEntityId}`}
              </AppText>
            </Pressable>
          ) : (
            <AppText variant="caption" color="textMuted">연결 없음</AppText>
          )}
        </Stack>
      </Pressable>
      <View style={styles.actions}>
        <Button
          label={done ? '다시 열기' : '완료 처리'}
          size="sm"
          variant={done ? 'secondary' : 'ghost'}
          disabled={todo.status === 'canceled'}
          loading={stateBusy}
          onPress={() => onToggleDone(todo)}
          style={styles.action}
        />
        <Button
          label="수정"
          size="sm"
          variant="ghost"
          onPress={() =>
            router.push({ pathname: '/todos/[todoId]/edit', params: { todoId: todo.id } })
          }
          style={styles.action}
        />
      </View>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: { padding: theme.spacing.lg },
    pressed: { opacity: theme.opacity.pressed, backgroundColor: theme.colors.surfaceSubtle },
    doneText: { textDecorationLine: 'line-through' },
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
