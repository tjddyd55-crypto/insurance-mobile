import { useMemo, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type ViewProps } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '../DesignSystemProvider';
import type { AppTheme } from '../themes';
import { useSafeFooterPadding } from './SafeFooter';

export type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  children: ReactNode;
};

export function Screen({ scroll = false, padded = true, style, children, ...rest }: ScreenProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  // Bottom nav-bar inset via the shared SSOT (Android edge-to-edge may report 0).
  const bottomPadding = useSafeFooterPadding(0);
  const content = (
    <View style={[styles.content, padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[styles.safe, { paddingBottom: bottomPadding }]} edges={['left', 'right']}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: theme.colors.background },
    content: { flex: 1 },
    padded: { padding: theme.spacing.lg },
    scrollContent: { flexGrow: 1 },
  });
}
