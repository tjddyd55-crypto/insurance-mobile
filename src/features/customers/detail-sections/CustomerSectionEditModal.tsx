import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Inline, ModalShell, Stack, useAppTheme, type AppTheme } from "../../../design-system";

export function CustomerSectionEditModal({
  open,
  title,
  children,
  saving = false,
  saveDisabled = false,
  onCancel,
  onSave,
  saveLabel = "저장",
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  saving?: boolean;
  saveDisabled?: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ModalShell
      open={open}
      title={title}
      presentation="dialog"
      scroll
      keyboardAvoiding
      busy={saving}
      closeOnBackdrop={false}
      dismissOnAndroidBack={!saving}
      onRequestClose={onCancel}
      footer={
        <View style={styles.footer}>
          <Inline gap="sm" style={styles.footerRow}>
            <Button
              label="취소"
              variant="secondary"
              disabled={saving}
              onPress={onCancel}
              style={styles.footerBtn}
            />
            <Button
              label={saveLabel}
              variant="action"
              disabled={saving || saveDisabled}
              onPress={onSave}
              style={styles.footerBtn}
            />
          </Inline>
        </View>
      }
    >
      <Stack gap="md" style={styles.body}>{children}</Stack>
    </ModalShell>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: {
      alignSelf: "stretch",
    },
    footer: {
      alignSelf: "stretch",
      paddingTop: theme.spacing.sm,
    },
    footerRow: {
      alignSelf: "stretch",
    },
    footerBtn: {
      flex: 1,
      minWidth: 0,
    },
  });
}
