import { useMemo } from "react";
import { Modal, ScrollView, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";
import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import {
  AppText,
  Button,
  Card,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { getCustomerGaExcelData } from "./customerGaDataApi";

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

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <View style={styles.grow}>
            <AppText variant="heading">GA 데이터 보기</AppText>
            <AppText variant="caption">{customerName}</AppText>
          </View>
          <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <Screen padded={false}>
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
            <EmptyState
              title="표시할 GA 데이터가 없습니다"
              message={
                query.data?.useGaExcel
                  ? "이 고객에 연결된 GA Excel 데이터가 없습니다."
                  : "GA Excel 기능이 활성화되지 않았습니다."
              }
            />
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
        </Screen>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: "row",
      alignItems: "center",
      gap: theme.spacing.md,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    grow: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.huge,
    },
  });
}
