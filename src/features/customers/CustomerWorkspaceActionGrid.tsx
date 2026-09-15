import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, useAppTheme, type AppTheme } from '../../design-system';
import type { CustomerSectionTheme } from './customerSectionTheme';
import type {
  CustomerWorkspaceAction,
  CustomerWorkspaceActionId,
} from './customerWorkspaceActions';

export function resolveWorkspaceActionButtonVariant(
  _actionId: CustomerWorkspaceActionId,
): 'secondary' {
  return 'secondary';
}

export function countEmphasizedWorkspaceActions(
  actions: CustomerWorkspaceAction[],
): number {
  return actions.filter((action) => 'variant' in action).length;
}

type CustomerWorkspaceActionGridProps = {
  actions: CustomerWorkspaceAction[];
  onAction: (actionId: CustomerWorkspaceActionId) => void;
  accentTheme?: CustomerSectionTheme;
};

export function CustomerWorkspaceActionGrid({
  actions,
  onAction,
  accentTheme,
}: CustomerWorkspaceActionGridProps) {
  const theme = useAppTheme();
  const styles = useMemo(
    () => createStyles(theme, accentTheme),
    [theme, accentTheme],
  );

  return (
    <View style={styles.actionGrid} testID="customer-workspace-action-grid">
      {actions.map((action) => (
        <Button
          key={action.id}
          testID={`customer-workspace-action-${action.id}`}
          accessibilityLabel={action.accessibilityLabel}
          label={action.label}
          size="sm"
          variant={resolveWorkspaceActionButtonVariant(action.id)}
          onPress={() => void onAction(action.id)}
          style={styles.actionButton}
        />
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme, accentTheme?: CustomerSectionTheme) {
  const greenAccent = accentTheme != null;
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
      ...(greenAccent
        ? {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.primaryBorder,
          }
        : null),
    },
  });
}
