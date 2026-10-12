import { useEffect, useMemo } from 'react';
import { BackHandler, Modal, StyleSheet, View } from 'react-native';

import { AppText, Button, useAppTheme, type AppTheme } from '../../design-system';
import type { UpdatePrompt } from './coordinator';

type Props = {
  prompt: UpdatePrompt | null;
  onConfirm: () => void;
  onDismiss: () => void;
};

/**
 * 업데이트 확인은 앱이 그려진 뒤에만 올린다.
 * 배경 터치는 닫지 않는다. Android 뒤로가기는 앱을 가두지 않도록 닫고 다음 단계로 넘긴다.
 */
export function AppUpdatePrompt({ prompt, onConfirm, onDismiss }: Props) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const open = prompt !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onDismiss();
      return true;
    });
    return () => subscription.remove();
  }, [open, onDismiss]);

  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <AppText variant="heading">업데이트</AppText>
          <AppText color="textSecondary">{prompt?.message ?? ''}</AppText>
          <View style={styles.actions}>
            {prompt?.dismissLabel ? (
              <Button
                label={prompt.dismissLabel}
                variant="secondary"
                onPress={onDismiss}
                style={styles.actionBtn}
              />
            ) : null}
            <Button
              label={prompt?.confirmLabel ?? ''}
              variant="primary"
              onPress={onConfirm}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: theme.colors.overlay,
      justifyContent: 'center',
      padding: theme.spacing.xl,
    },
    panel: {
      backgroundColor: theme.colors.surfaceElevated,
      borderRadius: theme.radius.lg,
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    actions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.sm,
    },
    actionBtn: { flex: 1 },
  });
}
