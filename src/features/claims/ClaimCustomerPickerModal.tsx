import { useMemo } from "react";
import { FlatList, StyleSheet, View } from "react-native";

import {
  AppText,
  Button,
  Card,
  Inline,
  ModalShell,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import type { listCustomers } from "../customers/customersApi";
import { formatCustomerPhone } from "../customers/customerModel";

type Customer = Awaited<ReturnType<typeof listCustomers>>["customers"][number];

export function ClaimCustomerPickerModal({
  open,
  customers,
  search,
  fixed,
  onSearchChange,
  onClose,
  onSelect,
}: {
  open: boolean;
  customers: Customer[];
  search: string;
  fixed: boolean;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelect: (id: number | null) => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const query = search.trim().toLowerCase();
  const rows = customers
    .filter((customer) => {
      const phoneQuery = query.replace(/\D/g, "");
      return (
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.replace(/\D/g, "").includes(phoneQuery)
      );
    })
    .slice(0, 100);

  return (
    <ModalShell
      open={open}
      title="고객 선택"
      subtitle={`${rows.length}명 표시`}
      scroll={false}
      onRequestClose={onClose}
      headerAction={
        <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
      }
    >
      <Stack gap="md" style={styles.body}>
        <TextField
          placeholder="이름 또는 연락처 검색"
          value={search}
          onChangeText={onSearchChange}
          autoFocus
        />
        {!fixed ? (
          <Button
            label="전체 고객 청구"
            variant="secondary"
            onPress={() => onSelect(null)}
          />
        ) : null}
        <FlatList
          data={rows}
          keyExtractor={(item) => String(item.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Card variant="outlined">
              <Inline justify="space-between">
                <View style={styles.copy}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption">
                    {formatCustomerPhone(item.phone)}
                  </AppText>
                </View>
                <Button
                  label="선택"
                  size="sm"
                  onPress={() => onSelect(item.id)}
                />
              </Inline>
            </Card>
          )}
        />
      </Stack>
    </ModalShell>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    body: { flex: 1 },
    list: { paddingBottom: theme.spacing.xl },
    separator: { height: theme.spacing.sm },
    copy: { flex: 1, minWidth: 0 },
  });
}
