import { useMemo } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";
import { AppHeader } from "../../components/AppHeader";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import {
  AppText,
  Card,
  Stack,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { getCustomerGaExcelData } from "./customerGaDataApi";
import { getGaDataEmptyState } from "./customerGaDataPresentation";

export function CustomerGaDataModal({
  open,
  customerId,
  customerName,
  onClose,
}: {
  open: boolean;
  customerId: number;
  customerName: string;
  onClose: () => void;
}) {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const query = useQuery({
    queryKey: ["customer-ga-excel", customerId],
    queryFn: () => getCustomerGaExcelData(token, customerId),
    enabled: Boolean(token) && open,
  });

  const emptyState = getGaDataEmptyState(query.data?.useGaExcel);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <AppHeader
          title="GA 데이터"
          subtitle={customerName}
          showMenu={false}
          showBack
          onBackPress={onClose}
        />
        <View style={styles.body}>
          {query.isLoading ? (
            <LoadingState message="GA 데이터를 불러오는 중…" compact />
          ) : query.isError ? (
            <ErrorState
              title="GA 데이터를 불러오지 못했습니다"
              message={
                query.error instanceof Error
                  ? query.error.message
                  : "잠시 후 다시 시도해 주세요."
              }
              onRetry={() => void query.refetch()}
            />
          ) : !query.data?.rows.length ? (
            <EmptyState title={emptyState.title} message={emptyState.message} />
          ) : (
            <ScrollView contentContainerStyle={styles.content}>
              {query.data.rows.map((row, index) => (
                <Card key={`ga-row-${index}`} variant="outlined">
                  <Stack gap="xs">
                    {query.data.columns.map((column) => (
                      <AppText key={column.key} variant="caption">
                        {column.label}: {String(row[column.key] ?? "—")}
                      </AppText>
                    ))}
                  </Stack>
                </Card>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    body: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.huge,
    },
  });
}
