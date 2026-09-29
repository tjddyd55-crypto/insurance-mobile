import { useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../auth/AuthProvider';
import { AppText, useAppTheme, type AppTheme } from '../design-system';
import { isBillingUiVisibleForUser } from '../features/billing/billingAccessPolicy';
import { billingCheckoutSummaryQueryKey, getCheckoutSummary } from '../features/billing/billingApi';
import { buildBillingStatusPill } from '../features/billing/billingStatusPill';

export function BillingStatusPill() {
  const { token, user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const query = useQuery({
    queryKey: billingCheckoutSummaryQueryKey,
    queryFn: () => getCheckoutSummary(token),
    enabled: Boolean(token && user?.role === 'USER' && isBillingUiVisibleForUser(user)),
    staleTime: 60_000,
  });
  const view = buildBillingStatusPill(query.data);
  if (!view) return null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`결제 상태: ${view.label}. 구독 및 결제로 이동`}
      onPress={() => router.push('/billing')}
      style={({ pressed }) => [
        styles.base,
        styles[view.tone],
        pressed && styles.pressed,
      ]}
    >
      <AppText
        variant="badge"
        numberOfLines={1}
        style={styles[`${view.tone}Text`]}
      >
        {view.label}
      </AppText>
    </Pressable>
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
    pressed: { opacity: theme.opacity.pressed },
  });
}
