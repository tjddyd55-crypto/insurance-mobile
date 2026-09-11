import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
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
  const toggleLabel = expanded ? "최소" : "펼치기";

  return (
    <Card variant="outlined" padding="none" testID={testID}>
      <View style={styles.sectionHeader}>
        <AppText variant="heading" numberOfLines={1} style={styles.title}>
          {title}
        </AppText>
        <Button
          label={toggleLabel}
          size="sm"
          variant="secondary"
          accessibilityLabel={`${title} ${toggleLabel}`}
          onPress={() => setExpanded((value) => !value)}
        />
      </View>
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
    sectionBody: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.sm + theme.spacing.xs,
    },
  });
}
