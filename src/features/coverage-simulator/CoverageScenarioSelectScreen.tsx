import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { AppHeader } from '../../components/AppHeader';
import { AppText, Button, Card, Screen, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { CoverageCustomerBar } from './CoverageCustomerBar';
import { SCENARIO_TYPE_CARDS } from './templates';

export function CoverageScenarioSelectScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.root}>
      <AppHeader title="보장 시뮬레이션" />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content}>
          <AppText color="textSecondary">상담할 시나리오를 선택하세요.</AppText>
          <CoverageCustomerBar />
          {SCENARIO_TYPE_CARDS.map((card) => (
            <Pressable
              key={card.diseaseType}
              accessibilityRole="button"
              accessibilityState={{ disabled: !card.enabled }}
              disabled={!card.enabled}
              onPress={() => router.push(`/customer-consulting/coverage-simulation/disease/${card.diseaseType}` as never)}
              style={({ pressed }) => [pressed && styles.pressed, !card.enabled && styles.disabled]}
            >
              <Card>
                <Stack gap="xs">
                  <AppText variant="heading">{card.title}</AppText>
                  <AppText color="textSecondary">{card.description}</AppText>
                </Stack>
              </Card>
            </Pressable>
          ))}
          <Button
            label="저장된 상담 불러오기"
            onPress={() => router.push('/customer-consulting/coverage-simulation/saved' as never)}
          />
        </ScrollView>
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: {
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
      gap: theme.spacing.md,
    },
    pressed: { opacity: theme.opacity.pressed },
    disabled: { opacity: 0.45 },
  });
}
