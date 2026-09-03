import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Card, Divider, Stack, useAppTheme, type AppTheme } from "../../design-system";

export function CollapsibleDetailSection({
  title,
  children,
  testID,
  defaultExpanded = true,
}: {
  title: string;
  children: React.ReactNode;
  testID?: string;
  defaultExpanded?: boolean;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card variant="outlined" padding="none" testID={testID}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title} ${expanded ? "접기" : "펼치기"}`}
        onPress={() => setExpanded((value) => !value)}
        style={styles.sectionHeader}
      >
        <AppText variant="sectionTitle">{title}</AppText>
        <AppText variant="caption" color="textSecondary">
          {expanded ? "접기 ▲" : "펼치기 ▼"}
        </AppText>
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

const DETAIL_LABEL_WIDTH = 104;

export function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`${label}, ${value}`}
    >
      <AppText variant="label" style={styles.label}>
        {label}
      </AppText>
      <AppText style={styles.value}>{value}</AppText>
    </View>
  );
}

/** Lightweight in-section label — nested cards 금지. */
export function DetailSubsectionLabel({ label }: { label: string }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.subsection}>
      <AppText variant="caption" color="textSecondary">
        {label}
      </AppText>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    sectionHeader: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + theme.spacing.xxs,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    sectionBody: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
    },
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
    },
    value: {
      flex: 1,
      minWidth: 0,
    },
  });
}
