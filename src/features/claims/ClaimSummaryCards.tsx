import { useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import type { ClaimStatusSummary } from "./claimsModel";
import type { ClaimStatus } from "./types";

type SummaryKey = "total" | ClaimStatus;

const SUMMARY_ITEMS: Array<{
  key: SummaryKey;
  label: string;
  statusFilter: ClaimStatus | "";
  tone: "default" | "warning" | "info" | "success" | "danger";
}> = [
  { key: "total", label: "전체", statusFilter: "", tone: "default" },
  { key: "requested", label: "신규 요청", statusFilter: "requested", tone: "warning" },
  { key: "processing", label: "처리중", statusFilter: "processing", tone: "info" },
  { key: "done", label: "완료", statusFilter: "done", tone: "success" },
  { key: "rejected", label: "반려", statusFilter: "rejected", tone: "danger" },
];

export function ClaimSummaryCards({
  summary,
  activeStatus,
  onSelectStatus,
}: {
  summary: ClaimStatusSummary;
  activeStatus: ClaimStatus | "";
  onSelectStatus: (status: ClaimStatus | "") => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.grid}>
      {SUMMARY_ITEMS.map((item) => {
        const count =
          item.key === "total" ? summary.total : summary[item.key];
        const selected = activeStatus === item.statusFilter;
        const toneStyle = styles[`tone_${item.tone}`];
        const selectedStyle = selected ? styles.selected : null;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={`${item.label} ${count}건`}
            onPress={() => onSelectStatus(item.statusFilter)}
            style={({ pressed }) => [
              styles.card,
              toneStyle,
              selectedStyle,
              pressed && styles.pressed,
            ]}
          >
            <AppText variant="caption" color="textSecondary" numberOfLines={1}>
              {item.label}
            </AppText>
            <AppText variant="heading" style={styles.count}>
              {count}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    card: {
      flexGrow: 1,
      flexBasis: "30%",
      minWidth: 96,
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.xxs,
    },
    tone_default: {
      backgroundColor: theme.colors.surface,
    },
    tone_warning: {
      backgroundColor: theme.colors.warningSoft,
    },
    tone_info: {
      backgroundColor: theme.colors.infoSoft,
    },
    tone_success: {
      backgroundColor: theme.colors.successSoft,
    },
    tone_danger: {
      backgroundColor: theme.colors.dangerSoft,
      borderColor: theme.colors.dangerBorder,
    },
    selected: {
      borderWidth: 2,
      borderColor: theme.colors.primary,
    },
    count: {
      fontSize: 20,
      lineHeight: 24,
    },
    pressed: {
      opacity: theme.opacity.pressed,
    },
  });
}
