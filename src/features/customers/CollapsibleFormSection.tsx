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
        <AppText variant="heading" numberOfLines={1}>{title}</AppText>
        <AppText variant="caption" color="textSecondary">
          {expanded ? "접기 ▲" : "펼치기 ▼"}
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
    sectionBody: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
    },
  });
}
