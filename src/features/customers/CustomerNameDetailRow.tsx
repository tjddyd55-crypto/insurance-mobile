import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { AppText, useAppTheme, type AppTheme } from "../../design-system";
import { DetailValueText } from "./CollapsibleDetailSection";
import {
  formatCustomerDetailValue,
  formatCustomerGenderParenthetical,
  getCustomerGenderPresentationTone,
} from "./customerDetailPresentation";
import type { CustomerGender } from "./types";

const DETAIL_LABEL_WIDTH = 88;

export function CustomerNameDetailRow({
  name,
  gender,
}: {
  name: string;
  gender: CustomerGender;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const displayName = formatCustomerDetailValue(name);
  const genderLabel = formatCustomerGenderParenthetical(gender);
  const genderTone = getCustomerGenderPresentationTone(gender);
  const genderColor =
    genderTone === "male"
      ? theme.colors.info
      : genderTone === "female"
        ? theme.colors.danger
        : undefined;

  const valueAccessibilityLabel = genderLabel
    ? `이름, ${displayName} ${genderLabel}`
    : `이름, ${displayName}`;

  return (
    <View style={styles.row}>
      <AppText variant="body" color="textSecondary" style={styles.label}>
        이름
      </AppText>
      <View style={styles.valueRow}>
        <DetailValueText
          style={styles.name}
          accessibilityLabel={valueAccessibilityLabel}
        >
          {displayName}
        </DetailValueText>
        {genderLabel ? (
          <DetailValueText
            variant="body"
            style={[styles.gender, genderColor ? { color: genderColor } : null]}
          >
            {genderLabel}
          </DetailValueText>
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
      gap: theme.spacing.xs,
    },
    name: {
      flexShrink: 1,
      minWidth: 0,
      fontSize: 16,
    },
    gender: {
      flexShrink: 0,
      fontSize: 15,
      fontWeight: "500",
    },
  });
}
