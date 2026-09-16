import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../auth/AuthProvider";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { AppText, Stack, TextField } from "../../../design-system";
import {
  createCustomerCustomField,
  deleteCustomerCustomField,
  type CustomerCustomFieldRecord,
  updateCustomerCustomField,
} from "../customerCustomFieldsApi";
import { getCustomerCustomFieldsValidationError } from "../customerCustomFieldFormUtils";
import { CollapsibleDetailSection } from "../CollapsibleDetailSection";
import { CustomerSectionEditModal } from "./CustomerSectionEditModal";
import { SectionAddAction, SectionRowWithAction } from "./CustomerSectionActions";

type EditMode = { kind: "add" } | { kind: "edit"; customFieldId: number };

export function CustomerCustomFieldsDetailSection({
  customerId,
  items,
  loading,
  expanded,
  onExpandedChange,
}: {
  customerId: number;
  items: CustomerCustomFieldRecord[] | undefined;
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [label, setLabel] = useState("");
  const [value, setValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerCustomFieldRecord | null>(null);
  const [error, setError] = useState("");

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-custom-fields", customerId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = { label: label.trim(), value: value.trim() };
      const validationError = getCustomerCustomFieldsValidationError([payload]);
      if (validationError) throw new Error(validationError);
      if (editMode?.kind === "edit") {
        return updateCustomerCustomField(token, customerId, editMode.customFieldId, payload);
      }
      return createCustomerCustomField(token, customerId, payload);
    },
    onSuccess: async () => {
      await invalidate();
      setEditMode(null);
      setError("");
      onExpandedChange(true);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (item: CustomerCustomFieldRecord) => {
      await deleteCustomerCustomField(token, customerId, item.id);
    },
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
      onExpandedChange(true);
    },
  });

  const openAdd = () => {
    setLabel("");
    setValue("");
    setError("");
    setEditMode({ kind: "add" });
  };

  const openEdit = (item: CustomerCustomFieldRecord) => {
    setLabel(item.label);
    setValue(item.value);
    setError("");
    setEditMode({ kind: "edit", customFieldId: item.id });
  };

  const rows = items ?? [];

  return (
    <>
      <CollapsibleDetailSection
        title="추가 정보"
        testID="customer-detail-section-custom-fields"
        sectionId="customFields"
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      >
        {loading ? (
          <AppText variant="body" color="textSecondary">추가 정보를 불러오는 중…</AppText>
        ) : rows.length ? (
          rows.map((item) => (
            <SectionRowWithAction key={item.id} onEdit={() => openEdit(item)}>
              <Stack gap="xs">
                <AppText variant="bodyStrong">{item.label}</AppText>
                <AppText variant="body" color="textSecondary">{item.value}</AppText>
              </Stack>
            </SectionRowWithAction>
          ))
        ) : (
          <AppText variant="body" color="textSecondary">등록된 추가 정보가 없습니다.</AppText>
        )}
        <SectionAddAction label="+ 항목 추가" onPress={openAdd} />
      </CollapsibleDetailSection>

      <CustomerSectionEditModal
        open={editMode != null}
        title={editMode?.kind === "edit" ? "추가 정보 수정" : "추가 정보 등록"}
        saving={saveMutation.isPending}
        onCancel={() => setEditMode(null)}
        onSave={() => saveMutation.mutate()}
      >
        <TextField
          label="라벨"
          value={label}
          onChangeText={setLabel}
        />
        <TextField
          label="내용"
          multiline
          value={value}
          onChangeText={setValue}
        />
        {editMode?.kind === "edit" ? (
          <AppText
            variant="body"
            color="danger"
            onPress={() => {
              const target = rows.find((row) => row.id === editMode.customFieldId);
              if (target) {
                setEditMode(null);
                setDeleteTarget(target);
              }
            }}
          >
            항목 삭제
          </AppText>
        ) : null}
        {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      </CustomerSectionEditModal>

      <ConfirmDialog
        open={deleteTarget != null}
        title="추가 정보를 삭제할까요?"
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
