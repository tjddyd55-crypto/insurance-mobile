import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, useAppTheme, type AppTheme } from "../../design-system";
import {
  CUSTOMER_DETAIL_EMPTY_VALUE,
  formatCustomerDetailDate,
  getInsuranceAgeDdayLabel,
} from "./customerDetailPresentation";

const DETAIL_LABEL_WIDTH = 88;

export function CustomerNextAgeDateDetailRow({
  nextAgeDate,
}: {
  nextAgeDate: string | null;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const dateText = formatCustomerDetailDate(nextAgeDate);
  const hasDate = dateText !== CUSTOMER_DETAIL_EMPTY_VALUE;
  const ddayLabel = hasDate ? getInsuranceAgeDdayLabel(nextAgeDate) : null;

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={
        ddayLabel
          ? `상령일, ${dateText} ${ddayLabel}`
          : `상령일, ${dateText}`
      }
    >
      <AppText variant="body" color="textSecondary" style={styles.label}>
        상령일
      </AppText>
      <View style={styles.valueRow}>
        <AppText variant="bodyStrong" style={styles.date}>{dateText}</AppText>
        {ddayLabel ? (
          <AppText variant="caption" style={styles.dday}>{ddayLabel}</AppText>
        ) : null}
      </View>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
    },
    label: {
      width: DETAIL_LABEL_WIDTH,
      flexShrink: 0,
      fontSize: 15,
    },
    valueRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
      gap: theme.spacing.sm,
    },
    date: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: 16,
    },
    dday: {
      flexShrink: 0,
      fontSize: 14,
      fontWeight: "600",
      color: theme.colors.primary,
    },
  });
}
