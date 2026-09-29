import { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import type {
  CustomerWorkspaceAction,
  CustomerWorkspaceActionId,
} from './customerWorkspaceActions';

/** Native 고객 업무 grid — 메인 초록 채움 버튼 SSOT. */
export function workspaceActionButtonSurface(theme: AppTheme) {
  return {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
    color: theme.colors.onPrimary,
  };
}

export function resolveWorkspaceActionButtonVariant(
  _actionId: CustomerWorkspaceActionId,
): 'filledGreen' {
  return 'filledGreen';
}

export function countEmphasizedWorkspaceActions(
  actions: CustomerWorkspaceAction[],
): number {
  return actions.filter((action) => 'variant' in action).length;
}

type CustomerWorkspaceActionGridProps = {
  actions: CustomerWorkspaceAction[];
  onAction: (actionId: CustomerWorkspaceActionId) => void;
};

export function CustomerWorkspaceActionGrid({
  actions,
  onAction,
}: CustomerWorkspaceActionGridProps) {
  const theme = useAppTheme();
  const surface = workspaceActionButtonSurface(theme);
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.actionGrid} testID="customer-workspace-action-grid">
      {actions.map((action) => (
        <Pressable
          key={action.id}
          testID={`customer-workspace-action-${action.id}`}
          accessibilityRole="button"
          accessibilityLabel={action.accessibilityLabel}
          onPress={() => void onAction(action.id)}
          style={({ pressed }) => [
            styles.actionButton,
            {
              backgroundColor: pressed ? theme.colors.primaryPressed : surface.backgroundColor,
              borderColor: surface.borderColor,
            },
          ]}
        >
          <AppText
            variant="button"
            numberOfLines={1}
            style={[styles.actionLabel, { color: surface.color }]}
          >
            {action.label}
          </AppText>
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    actionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs + 2,
    },
    actionButton: {
      flexGrow: 1,
      flexBasis: '46%',
      minHeight: 44,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
    },
    actionLabel: {
      fontWeight: '600',
      textAlign: 'center',
    },
  });
}
