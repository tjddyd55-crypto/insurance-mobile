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

export function CollapsibleFormSection({
  title,
  children,
  testID,
  defaultExpanded = false,
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
        <AppText variant="heading" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <AppText variant="caption" color="textSecondary" style={styles.chevron}>
          {expanded ? "▲" : "▼"}
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

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    sectionHeader: {
      minHeight: 44,
      paddingHorizontal: theme.spacing.sm + theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      minWidth: 0,
    },
    chevron: {
      flexShrink: 0,
      paddingHorizontal: theme.spacing.xs,
    },
    sectionBody: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
    },
  });
}
