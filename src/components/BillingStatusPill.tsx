import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';
import { AppText, useAppTheme, type AppTheme } from '../design-system';
import { getCheckoutSummary } from '../features/billing/billingApi';
import { buildBillingStatusPill } from '../features/billing/billingStatusPill';

export function BillingStatusPill() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const query = useQuery({
    queryKey: ['billing', 'checkout'],
    queryFn: () => getCheckoutSummary(token),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
  const view = buildBillingStatusPill(query.data);
  if (!view) return null;
  return (
    <View
      accessible
      accessibilityLabel={`결제 상태: ${view.label}`}
      style={[styles.base, styles[view.tone]]}
    >
      <AppText
        variant="badge"
        numberOfLines={1}
        style={styles[`${view.tone}Text`]}
      >
        {view.label}
      </AppText>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    base: {
      flexShrink: 1,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
    },
    primary: { backgroundColor: theme.colors.primaryPressed },
    neutral: { backgroundColor: theme.colors.text },
    warning: { backgroundColor: theme.colors.warning },
    danger: { backgroundColor: theme.colors.danger },
    primaryText: { color: theme.colors.onPrimary },
    neutralText: { color: theme.colors.onPrimary },
    warningText: { color: theme.colors.warningText },
    dangerText: { color: theme.colors.onPrimary },
  });
}
