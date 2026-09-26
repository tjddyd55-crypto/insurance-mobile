import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { CoverageCustomerBar } from './CoverageCustomerBar';
import { CoveragePrimaryButton, CoverageSimulatorHeader, CoverageSimulatorScreen } from './CoverageSimulatorChrome';
import { simulatorTheme as theme } from './simulatorTheme';
import { SCENARIO_TYPE_CARDS } from './templates';

export function CoverageScenarioSelectScreen() {
  const router = useRouter();

  return (
    <CoverageSimulatorScreen>
      <CoverageSimulatorHeader title="보장 시뮬레이션" onBack={() => router.back()} />
      <ScrollView contentContainerStyle={styles.content}>
        <CoverageCustomerBar />
        {SCENARIO_TYPE_CARDS.map((card) => (
          <Pressable
            key={card.diseaseType}
            accessibilityRole="button"
            accessibilityState={{ disabled: !card.enabled }}
            disabled={!card.enabled}
            onPress={() => router.push(`/customer-consulting/coverage-simulation/disease/${card.diseaseType}` as never)}
            style={[styles.card, !card.enabled && styles.disabled]}
          >
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.description}</Text>
          </Pressable>
        ))}
        <View style={styles.cta}>
          <CoveragePrimaryButton
            label="저장된 상담 불러오기"
            onPress={() => router.push('/customer-consulting/coverage-simulation/saved' as never)}
          />
        </View>
      </ScrollView>
    </CoverageSimulatorScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 },
  card: {
    width: '100%',
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)',
  },
  disabled: { opacity: 0.55 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: theme.text, marginBottom: 4 },
  cardDesc: { fontSize: 13, color: theme.muted, lineHeight: 19 },
  cta: { marginTop: 8 },
});
