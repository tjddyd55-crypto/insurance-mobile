import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, useAppTheme, type AppTheme } from "../../design-system";
import { CustomerAppLinkStatusRow } from "./CustomerAppLinkSection";
import { CustomerWorkspaceActionGrid } from "./CustomerWorkspaceActionGrid";
import type {
  CustomerWorkspaceAction,
  CustomerWorkspaceActionId,
} from "./customerWorkspaceActions";

type CustomerDetailTaskPanelProps = {
  customerId: number;
  customerName: string;
  customerPhone: string;
  actions: CustomerWorkspaceAction[];
  onAction: (actionId: CustomerWorkspaceActionId) => void;
  copyNotice?: string;
};

export function CustomerDetailTaskPanel({
  customerId,
  customerName,
  customerPhone,
  actions,
  onAction,
  copyNotice,
}: CustomerDetailTaskPanelProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.panel} testID="customer-detail-task-panel">
      <CustomerAppLinkStatusRow
        customerId={customerId}
        customerName={customerName}
        customerPhone={customerPhone}
      />
      <View style={styles.divider} accessibilityElementsHidden />
      <CustomerWorkspaceActionGrid actions={actions} onAction={onAction} />
      {copyNotice ? (
        <AppText variant="body" color="success">
          {copyNotice}
        </AppText>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    panel: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  });
}
