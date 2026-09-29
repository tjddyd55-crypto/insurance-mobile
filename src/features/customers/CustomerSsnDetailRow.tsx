import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, IconButton, useAppTheme, type AppTheme } from "../../design-system";
import { getCustomerSsnVisibilityMeta } from "./customerDetailPresentation";

const EYE_ICONS = {
  show: { ios: "eye" as const, android: "visibility" as const },
  hide: { ios: "eye.slash" as const, android: "visibility_off" as const },
};

export function CustomerSsnDetailRow({
  customerId,
  ssn,
}: {
  customerId: number;
  ssn: string;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [isVisible, setIsVisible] = useState(false);
  const { canToggle, displayValue, accessibilityLabel } = getCustomerSsnVisibilityMeta(
    ssn,
    isVisible,
  );

  useEffect(() => {
    setIsVisible(false);
  }, [customerId, ssn]);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`주민번호, ${displayValue}`}
    >
      <AppText variant="body" color="textSecondary" style={styles.label}>
        주민번호
      </AppText>
      <View style={styles.valueRow}>
        <AppText variant="bodyStrong" style={styles.value}>{displayValue}</AppText>
        {canToggle ? (
          <IconButton
            accessibilityLabel={accessibilityLabel}
            variant="ghost"
            onPress={() => setIsVisible((prev) => !prev)}
            icon={(color) => (
              <SymbolView
                name={isVisible ? EYE_ICONS.hide : EYE_ICONS.show}
                size={20}
                tintColor={color}
                fallback={
                  <AppText variant="body" color="textSecondary">
                    {isVisible ? "숨김" : "보기"}
                  </AppText>
                }
              />
            )}
          />
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
      width: 88,
      flexShrink: 0,
      fontSize: 15,
    },
    valueRow: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.xs,
    },
    value: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
    },
  });
}
