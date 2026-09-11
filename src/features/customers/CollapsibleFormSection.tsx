import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import {
  AppText,
  Card,
  Divider,
  Stack,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import {
  customerSectionTheme,
  type CustomerSectionId,
} from "./customerSectionTheme";

export function CollapsibleFormSection({
  title,
  children,
  testID,
  defaultExpanded = false,
  sectionId,
}: {
  title: string;
  children: React.ReactNode;
  testID?: string;
  defaultExpanded?: boolean;
  sectionId?: CustomerSectionId;
}) {
  const theme = useAppTheme();
  const sectionTheme = sectionId ? customerSectionTheme(sectionId) : null;
  const styles = useMemo(
    () => createStyles(theme, sectionTheme?.accent, sectionTheme?.tint),
    [theme, sectionTheme?.accent, sectionTheme?.tint],
  );
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card variant="outlined" padding="none" testID={testID} style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${title} ${expanded ? "접기" : "펼치기"}`}
        onPress={() => setExpanded((value) => !value)}
        style={styles.sectionHeader}
      >
        {sectionTheme ? (
          <View style={[styles.accentBar, { backgroundColor: sectionTheme.accent }]} />
        ) : null}
        <AppText variant="heading" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary" style={styles.toggle}>
          {expanded ? "최소 ˄" : "펼치기 ˅"}
        </AppText>
      </Pressable>
      {expanded ? (
        <>
          <Divider />
          <View style={styles.sectionBody}>
            <Stack gap="lg">{children}</Stack>
          </View>
        </>
      ) : null}
    </Card>
  );
}

function createStyles(theme: AppTheme, accent?: string, tint?: string) {
  return StyleSheet.create({
    card: {
      overflow: "hidden",
      borderRadius: 12,
    },
    sectionHeader: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
      backgroundColor: tint ?? theme.colors.surface,
    },
    accentBar: {
      width: 3,
      height: 20,
      borderRadius: 2,
      flexShrink: 0,
      backgroundColor: accent ?? theme.colors.textSecondary,
    },
    title: {
      flex: 1,
      minWidth: 0,
      fontSize: 17,
      fontWeight: "700",
    },
    toggle: {
      flexShrink: 0,
      fontSize: 14,
      fontWeight: "500",
    },
    sectionBody: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
    },
  });
}
