import { Pressable, StyleSheet, View } from "react-native";

import { AppText, Button, useAppTheme, type AppTheme } from "../../../design-system";

export function SectionEditAction({
  label = "수정",
  onPress,
  disabled,
}: {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useAppTheme();
  const styles = createActionStyles(theme);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.editAction, pressed && !disabled ? styles.pressed : null]}
    >
      <AppText variant="body" color="primary" style={styles.editLabel}>
        {label}
      </AppText>
    </Pressable>
  );
}

export function SectionAddAction({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ alignSelf: "stretch", marginTop: 8 }}>
      <Button
        label={label}
        variant="secondary"
        size="sm"
        disabled={disabled}
        onPress={onPress}
        style={{ alignSelf: "stretch" }}
      />
    </View>
  );
}

export function SectionRowWithAction({
  children,
  onEdit,
  editLabel = "수정",
}: {
  children: React.ReactNode;
  onEdit: () => void;
  editLabel?: string;
}) {
  const theme = useAppTheme();
  const styles = createActionStyles(theme);
  return (
    <View style={styles.rowWithAction}>
      <View style={styles.rowContent}>{children}</View>
      <SectionEditAction label={editLabel} onPress={onEdit} />
    </View>
  );
}

function createActionStyles(theme: AppTheme) {
  return StyleSheet.create({
    rowWithAction: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    rowContent: {
      flex: 1,
      minWidth: 0,
    },
    editAction: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.xs,
      flexShrink: 0,
    },
    editLabel: {
      fontSize: 15,
      fontWeight: "600",
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
