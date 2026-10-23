import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { AppText, Button, ModalShell, Screen, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { coverageQueryKey } from '../coverage-simulator/CoverageSimulationListScreen';
import {
  listConsultationsByCustomerId,
  listScenarioLibrary,
  saveConsultation,
} from '../coverage-simulator/consultationRepository';
import { consultationStorage } from '../coverage-simulator/consultationStorage';
import { formatConsultationListDate } from '../coverage-simulator/coverageAnalysis';
import { createSimulationFromScenario } from '../coverage-simulator/scenarioEdits';
import { getCustomer } from '../customers/customersApi';
import { customerQueryKeys } from '../customers/queryKeys';
import { useCustomerDetailBack } from '../customers/customerWorkspaceNavigation';

type Props = {
  customerId: number;
};

export function CustomerCoverageSimulationsScreen({ customerId }: Props) {
  const { user, token } = useAuth();
  const userId = user?.id ?? '';
  const customerIdStr = String(customerId);
  const router = useRouter();
  const onBackPress = useCustomerDetailBack(customerId);
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [scenarioPickerOpen, setScenarioPickerOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const customerQuery = useQuery({
    queryKey: customerQueryKeys.workspace(customerId),
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token && customerId),
  });

  const listQuery = useQuery({
    queryKey: [...coverageQueryKey(userId), 'by-customer', customerIdStr],
    queryFn: () => listConsultationsByCustomerId(consultationStorage, userId, customerIdStr),
    enabled: Boolean(userId && customerId),
  });

  const scenariosQuery = useQuery({
    queryKey: [...coverageQueryKey(userId), 'scenario-library'],
    queryFn: () => listScenarioLibrary(consultationStorage, userId),
    enabled: Boolean(userId && scenarioPickerOpen),
  });

  const openSimulation = (simulationId: string) => {
    router.push(`/customer-consulting/coverage-simulation/scenarios/${simulationId}` as never);
  };

  const createSimulation = async (scenarioId: string) => {
    if (!userId || creating) return;
    const template = (scenariosQuery.data ?? []).find((row) => row.id === scenarioId);
    if (!template) return;
    const customerName = customerQuery.data?.name?.trim() ?? null;
    setCreating(true);
    try {
      const draft = createSimulationFromScenario(template, {
        id: customerIdStr,
        name: customerName,
      });
      const saved = await saveConsultation(consultationStorage, userId, draft);
      await queryClient.invalidateQueries({ queryKey: coverageQueryKey(userId) });
      setScenarioPickerOpen(false);
      openSimulation(saved.id);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Screen>
      <AppHeader title="시뮬레이션" onBackPress={onBackPress} />
      <ScrollView contentContainerStyle={styles.content}>
        <Button
          label="+ 시뮬레이션 추가"
          size="sm"
          variant="action"
          onPress={() => setScenarioPickerOpen(true)}
          testID="customer-coverage-simulations-add"
        />
        {listQuery.isLoading ? <AppText variant="body">불러오는 중…</AppText> : null}
        {!listQuery.isLoading && (listQuery.data ?? []).length === 0 ? (
          <AppText variant="body" color="textSecondary">
            연결된 시뮬레이션이 없습니다.
          </AppText>
        ) : null}
        <Stack gap="sm">
          {(listQuery.data ?? []).map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              style={styles.row}
              onPress={() => openSimulation(row.id)}
            >
              <AppText variant="bodyStrong">{row.title}</AppText>
              <AppText variant="caption" color="textSecondary">
                {formatConsultationListDate(row.updatedAt)} · 수정 {formatConsultationListDate(row.updatedAt)}
              </AppText>
            </Pressable>
          ))}
        </Stack>
      </ScrollView>

      <ModalShell
        open={scenarioPickerOpen}
        onRequestClose={() => setScenarioPickerOpen(false)}
        title="시나리오 선택"
        presentation="dialog"
      >
        <ScrollView style={styles.pickerScroll}>
          {scenariosQuery.isLoading ? <AppText variant="body">시나리오 불러오는 중…</AppText> : null}
          {(scenariosQuery.data ?? []).map((scenario) => (
            <Pressable
              key={scenario.id}
              accessibilityRole="button"
              style={styles.pickerRow}
              disabled={creating}
              onPress={() => void createSimulation(scenario.id)}
            >
              <AppText variant="body">{scenario.title}</AppText>
            </Pressable>
          ))}
        </ScrollView>
      </ModalShell>
    </Screen>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    content: {
      padding: theme.spacing.md,
      gap: theme.spacing.md,
    },
    row: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
      gap: theme.spacing.xs,
    },
    pickerScroll: {
      maxHeight: 360,
    },
    pickerRow: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
    },
  });
}
