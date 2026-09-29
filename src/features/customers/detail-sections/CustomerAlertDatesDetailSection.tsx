import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../auth/AuthProvider";
import { DateField } from "../../../components/DateField";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { AppText, Stack, TextField } from "../../../design-system";
import {
  DEFAULT_ALERT_DATE_PURPOSE,
  formatCustomerAlertDateLabel,
} from "../customerAlertDateDisplay";
import { formatCustomerDetailDate } from "../customerDetailPresentation";
import {
  createCustomerSpecialDate,
  deleteCustomerSpecialDate,
  type CustomerSpecialDateRecord,
  updateCustomerSpecialDate,
  validateCustomerSpecialDateInput,
} from "../customerSpecialDatesApi";
import { CollapsibleDetailSection } from "../CollapsibleDetailSection";
import { CustomerSectionEditModal } from "./CustomerSectionEditModal";
import { SectionAddAction, SectionRowWithAction } from "./CustomerSectionActions";

type EditMode = { kind: "add" } | { kind: "edit"; specialDateId: number };

export function CustomerAlertDatesDetailSection({
  customerId,
  items,
  loading,
  expanded,
  onExpandedChange,
}: {
  customerId: number;
  items: CustomerSpecialDateRecord[] | undefined;
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [label, setLabel] = useState("");
  const [dateValue, setDateValue] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<CustomerSpecialDateRecord | null>(null);
  const [error, setError] = useState("");

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-special-dates", customerId] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        purposeType: DEFAULT_ALERT_DATE_PURPOSE,
        title: label.trim(),
        dateValue: dateValue.trim(),
      };
      const validation = validateCustomerSpecialDateInput(payload);
      if (validation) {
        throw new Error(validation);
      }
      if (editMode?.kind === "edit") {
        return updateCustomerSpecialDate(token, customerId, editMode.specialDateId, payload);
      }
      return createCustomerSpecialDate(token, customerId, payload);
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
    mutationFn: async (item: CustomerSpecialDateRecord) => {
      await deleteCustomerSpecialDate(token, customerId, item.id);
    },
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
      onExpandedChange(true);
    },
  });

  const openAdd = () => {
    setLabel("");
    setDateValue("");
    setError("");
    setEditMode({ kind: "add" });
  };

  const openEdit = (item: CustomerSpecialDateRecord) => {
    setLabel(formatCustomerAlertDateLabel(item));
    setDateValue(item.dateValue);
    setError("");
    setEditMode({ kind: "edit", specialDateId: item.id });
  };

  const rows = items ?? [];

  return (
    <>
      <CollapsibleDetailSection
        title="알림일"
        testID="customer-detail-section-special-dates"
        sectionId="anniversary"
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      >
        {loading ? (
          <AppText variant="body" color="textSecondary">알림일을 불러오는 중…</AppText>
        ) : rows.length ? (
          rows.map((item) => (
            <SectionRowWithAction key={item.id} onEdit={() => openEdit(item)}>
              <Stack gap="xs">
                <AppText variant="bodyStrong">{formatCustomerAlertDateLabel(item)}</AppText>
                <AppText variant="body" color="textSecondary">
                  {formatCustomerDetailDate(item.dateValue)}
                </AppText>
              </Stack>
            </SectionRowWithAction>
          ))
        ) : (
          <AppText variant="body" color="textSecondary">등록된 알림일이 없습니다.</AppText>
        )}
        <SectionAddAction label="+ 알림일 추가" onPress={openAdd} />
      </CollapsibleDetailSection>

      <CustomerSectionEditModal
        open={editMode != null}
        title={editMode?.kind === "edit" ? "알림일 수정" : "알림일 추가"}
        saving={saveMutation.isPending}
        onCancel={() => setEditMode(null)}
        onSave={() => saveMutation.mutate()}
      >
        <TextField
          label="라벨"
          value={label}
          onChangeText={setLabel}
          placeholder="예: 자동차보험 갱신"
        />
        <DateField
          label="날짜"
          value={dateValue}
          onChange={setDateValue}
        />
        {editMode?.kind === "edit" ? (
          <AppText
            variant="body"
            color="danger"
            onPress={() => {
              const target = rows.find((row) => row.id === editMode.specialDateId);
              if (target) {
                setEditMode(null);
                setDeleteTarget(target);
              }
            }}
          >
            알림일 삭제
          </AppText>
        ) : null}
        {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      </CustomerSectionEditModal>

      <ConfirmDialog
        open={deleteTarget != null}
        title="알림일을 삭제할까요?"
        message="삭제한 알림일은 더 이상 알림에 표시되지 않습니다."
        confirmLabel="삭제"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
      />
    </>
  );
}
