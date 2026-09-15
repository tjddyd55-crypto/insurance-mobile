import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { AppText, Card, Divider, Stack, useAppTheme, type AppTheme } from "../../design-system";
import {
  customerSectionBorderStyle,
  customerSectionTheme,
  type CustomerSectionId,
} from "./customerSectionTheme";

const CHEVRON_NAMES = {
  down: { ios: "chevron.down" as const, android: "expand_more" as const },
  up: { ios: "chevron.up" as const, android: "expand_less" as const },
};

export function CollapsibleDetailSection({
  title,
  children,
  testID,
  defaultExpanded = true,
  expanded: expandedProp,
  onExpandedChange,
  sectionId,
}: {
  title: string;
  children: React.ReactNode;
  testID?: string;
  defaultExpanded?: boolean;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  sectionId?: CustomerSectionId;
}) {
  const theme = useAppTheme();
  const sectionTheme = sectionId ? customerSectionTheme(sectionId) : null;
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = expandedProp ?? internalExpanded;
  const setExpanded = (next: boolean) => {
    if (expandedProp === undefined) {
      setInternalExpanded(next);
    }
    onExpandedChange?.(next);
  };
  const borderStyle = customerSectionBorderStyle(
    sectionId,
    expanded,
    theme.colors.border,
  );
  const styles = useMemo(() => createStyles(theme, sectionTheme), [theme, sectionTheme]);

  return (
    <Card
      variant="outlined"
      padding="none"
      testID={testID}
      style={[styles.card, borderStyle]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title} ${expanded ? "접기" : "펼치기"}`}
        onPress={() => setExpanded(!expanded)}
        style={styles.sectionHeader}
      >
        {sectionTheme ? (
          <View style={[styles.accentBar, { backgroundColor: sectionTheme.accent }]} />
        ) : null}
        <AppText variant="heading" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <View style={styles.toggleIconWrap} accessibilityElementsHidden importantForAccessibility="no">
          <SymbolView
            name={expanded ? CHEVRON_NAMES.up : CHEVRON_NAMES.down}
            size={20}
            tintColor={theme.colors.textSecondary}
            fallback={
              <AppText variant="body" color="textSecondary" style={styles.toggleFallback}>
                {expanded ? "˄" : "˅"}
              </AppText>
            }
          />
        </View>
      </Pressable>
      {expanded ? (
        <>
          <Divider />
          <Stack gap="none" style={styles.sectionBody}>
            {children}
          </Stack>
        </>
      ) : null}
    </Card>
  );
}

const DETAIL_LABEL_WIDTH = 88;

export function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <AppText variant="body" color="textSecondary" style={styles.label}>
        {label}
      </AppText>
      <AppText variant="bodyStrong" style={styles.value}>{value}</AppText>
    </View>
  );
}

/** Lightweight in-section label — nested cards 금지. */
export function DetailSubsectionLabel({ label }: { label: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createDetailStyles(theme), [theme]);
  return (
    <View style={styles.subsection}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function createStyles(
  theme: AppTheme,
  sectionTheme: ReturnType<typeof customerSectionTheme> | null,
) {
  return StyleSheet.create({
    card: {
      overflow: "hidden",
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
    },
    sectionHeader: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
    },
    accentBar: {
      width: 3,
      height: 20,
      borderRadius: 2,
      flexShrink: 0,
      backgroundColor: sectionTheme?.accent ?? theme.colors.textSecondary,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: 17,
      fontWeight: "700",
    },
    toggleIconWrap: {
      width: 48,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginRight: -theme.spacing.xs,
    },
    toggleFallback: {
      fontSize: 18,
      lineHeight: 20,
      fontWeight: "600",
    },
    sectionBody: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      backgroundColor: theme.colors.surface,
    },
  });
}

function createDetailStyles(theme: AppTheme) {
  return StyleSheet.create({
    subsection: {
      paddingTop: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
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
    value: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
    },
  });
}
