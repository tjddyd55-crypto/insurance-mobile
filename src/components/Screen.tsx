import { SafeAreaView, ScrollView, StyleSheet, View, type ViewProps } from 'react-native';

import { colors, spacing } from '../theme/tokens';

type ScreenProps = ViewProps & {
  scroll?: boolean;
  padded?: boolean;
  children: React.ReactNode;
};

export function Screen({ scroll, padded = true, style, children, ...rest }: ScreenProps) {
  const content = (
    <View style={[padded && styles.padded, style]} {...rest}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgBase },
  padded: { flex: 1, padding: spacing.lg },
  scrollContent: { flexGrow: 1 },
});
