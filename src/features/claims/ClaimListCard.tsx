import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  Badge,
  Button,
  Card,
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
  showCustomerName = true,
}: {
  claim: ClaimListItem;
  onPress: () => void;
  showCustomerName?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const status = claimStatusMeta(claim.status);
  const customerName = claim.customerName || claim.requesterName || "고객";
  const requesterName = claim.requesterName || customerName;
  const metaParts = [
    showCustomerName ? customerName : null,
    formatClaimDate(claim.submittedAt),
    `파일 ${claim.fileCount}개`,
  ].filter(Boolean);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`청구 #${claim.id} ${requesterName} ${status.label}`}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      <Card variant="outlined" padding="md">
        <Stack gap="sm">
          <View style={styles.header}>
            <AppText variant="bodyStrong" numberOfLines={1} style={styles.title}>
              #{claim.id} {requesterName}
            </AppText>
            <Badge label={status.label} tone={status.tone} />
          </View>
          <AppText variant="caption" color="textSecondary" numberOfLines={1}>
            {metaParts.join(" · ")}
          </AppText>
          <AppText color="textSecondary" numberOfLines={2}>
            {claimListPreview(claim.title, claim.memo)}
          </AppText>
          <View style={styles.footer}>
            <Button
              label="상세"
              size="sm"
              variant="secondary"
              onPress={onPress}
            />
          </View>
        </Stack>
      </Card>
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    pressed: { opacity: theme.opacity.pressed },
    header: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    title: { flex: 1, minWidth: 0 },
    footer: {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
  });
}
