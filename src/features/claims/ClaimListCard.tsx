import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  Badge,
  Stack,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import {
  claimListPreview,
  claimStatusMeta,
  formatClaimDate,
} from "./claimsModel";
import type { ClaimListItem } from "./types";

export function ClaimListCard({
  claim,
  onPress,
}: {
  claim: ClaimListItem;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const status = claimStatusMeta(claim.status);
  const customerName = claim.customerName || claim.requesterName || "고객";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`청구 #${claim.id} ${customerName} ${status.label}`}
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <Stack gap="sm">
        <View style={styles.header}>
          <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
            #{claim.id} {claim.requesterName || customerName}
          </AppText>
          <Badge label={status.label} tone={status.tone} />
        </View>
        <AppText variant="caption" numberOfLines={1}>
          {customerName} · {formatClaimDate(claim.submittedAt)} · 파일{" "}
          {claim.fileCount}개
        </AppText>
        <AppText color="textSecondary" numberOfLines={3}>
          {claimListPreview(claim.title, claim.memo)}
        </AppText>
      </Stack>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    card: {
      minHeight: theme.interaction.minimumTouchTarget,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderRadius: theme.radius.lg,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    pressed: { opacity: theme.opacity.pressed },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.md,
    },
    title: { flex: 1, minWidth: 0 },
  });
}
