import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../auth/AuthProvider";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { AppText, useAppTheme, type AppTheme } from "../../../design-system";
import { DetailSubsectionLabel } from "../CollapsibleDetailSection";
import {
  createCustomerCustomField,
  deleteCustomerCustomField,
  type CustomerCustomFieldRecord,
  updateCustomerCustomField,
} from "../customerCustomFieldsApi";
import { CustomerCustomFieldModal, type CustomerCustomFieldModalMode } from "./CustomerCustomFieldModal";
import { SectionAddAction } from "./CustomerSectionActions";

const DETAIL_LABEL_WIDTH = 88;

type ModalState =
  | { kind: "create" }
  | { kind: "edit"; customFieldId: number; label: string; value: string };

export function CustomerBasicInlineCustomFields({
  customerId,
  items,
  loading,
}: {
  customerId: number;
  items: CustomerCustomFieldRecord[] | undefined;
  loading: boolean;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [modal, setModal] = useState<ModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerCustomFieldRecord | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const rows = items ?? [];

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-custom-fields", customerId] });
  };

  const saveMutation = useMutation({
    mutationFn: async (payload: { label: string; value: string }) => {
      if (modal?.kind === "edit") {
        return updateCustomerCustomField(token, customerId, modal.customFieldId, payload);
      }
      return createCustomerCustomField(token, customerId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      setModal(null);
      setSaveError(null);
    },
    onError: (err) => {
      setSaveError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: CustomerCustomFieldRecord) => {
      await deleteCustomerCustomField(token, customerId, item.id);
    },
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
    },
  });

  const openCreate = () => {
    setSaveError(null);
    setModal({ kind: "create" });
  };

  const openEdit = (item: CustomerCustomFieldRecord) => {
    setSaveError(null);
    setModal({
      kind: "edit",
      customFieldId: item.id,
      label: item.label,
      value: item.value,
    });
  };

  const modalMode: CustomerCustomFieldModalMode =
    modal?.kind === "edit" ? "edit" : "create";

  return (
    <>
      <View testID="customer-basic-inline-custom-fields">
        <DetailSubsectionLabel label="추가 정보" />
        {loading ? (
          <AppText variant="body" color="textSecondary" style={styles.loading}>
            추가 정보를 불러오는 중…
          </AppText>
        ) : rows.length ? (
          rows.map((item) => (
            <View key={item.id} style={styles.row}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.label}, ${item.value}, 수정`}
                style={styles.rowMain}
                onPress={() => openEdit(item)}
              >
                <AppText variant="body" color="textSecondary" style={styles.label}>
                  {item.label}
                </AppText>
                <AppText variant="bodyStrong" style={styles.value} numberOfLines={3}>
                  {item.value}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.label} 삭제`}
                hitSlop={8}
                style={styles.deleteBtn}
                onPress={() => setDeleteTarget(item)}
              >
                <AppText variant="body" color="textSecondary" style={styles.deleteLabel}>
                  ×
                </AppText>
              </Pressable>
            </View>
          ))
        ) : null}
        <SectionAddAction label="+ 라벨 추가" onPress={openCreate} />
      </View>

      <CustomerCustomFieldModal
        open={modal != null}
        mode={modalMode}
        initialLabel={modal?.kind === "edit" ? modal.label : ""}
        initialValue={modal?.kind === "edit" ? modal.value : ""}
        saving={saveMutation.isPending}
        serverError={saveError}
        onClose={() => {
          setModal(null);
          setSaveError(null);
        }}
        onSave={(payload) => saveMutation.mutate(payload)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="이 추가 정보를 삭제할까요?"
        message="삭제한 정보는 복구하기 어려울 수 있습니다."
        confirmLabel="삭제"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    loading: {
      paddingVertical: theme.spacing.sm,
    },
    row: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    rowMain: {
      flex: 1,
      minWidth: 0,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: theme.spacing.md,
    },
    label: {
      width: DETAIL_LABEL_WIDTH,
      flexShrink: 0,
      fontSize: 15,
    },
    value: {
      flex: 1,
      minWidth: 0,
      fontSize: 16,
    },
    deleteBtn: {
      width: 32,
      height: 32,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
      marginTop: -2,
    },
    deleteLabel: {
      fontSize: 22,
      lineHeight: 24,
      fontWeight: "400",
    },
  });
}
