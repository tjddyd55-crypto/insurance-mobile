import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../auth/AuthProvider";
import { AddressSearchField } from "../../../components/AddressSearchField";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { AppText, Stack, TextField } from "../../../design-system";
import { formatAddressForSave, parseAddressFromSave } from "../customerAddressSearch";
import { formatCustomerDetailValue } from "../customerDetailPresentation";
import {
  createCustomerFireInsuranceLocation,
  createEmptyFireInsuranceLocation,
  customerFireInsuranceLocationRecordToFormItem,
  deleteCustomerFireInsuranceLocation,
  type CustomerFireInsuranceLocationFormItem,
  type CustomerFireInsuranceLocationRecord,
  updateCustomerFireInsuranceLocation,
} from "../customerFireInsuranceLocationsApi";
import { CollapsibleDetailSection, DetailRow, DetailSubsectionLabel } from "../CollapsibleDetailSection";
import { CustomerSectionEditModal } from "./CustomerSectionEditModal";
import { SectionAddAction, SectionRowWithAction } from "./CustomerSectionActions";

type EditMode = { kind: "add" } | { kind: "edit"; locationId: number };

export function CustomerFireInsuranceDetailSection({
  customerId,
  locations,
  loading,
  expanded,
  onExpandedChange,
}: {
  customerId: number;
  locations: CustomerFireInsuranceLocationRecord[] | undefined;
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [draft, setDraft] = useState<CustomerFireInsuranceLocationFormItem>(() =>
    createEmptyFireInsuranceLocation(),
  );
  const [deleteTarget, setDeleteTarget] = useState<CustomerFireInsuranceLocationRecord | null>(null);
  const [error, setError] = useState("");

  const invalidate = async () => {
    await queryClient.invalidateQueries({
      queryKey: ["customer-fire-insurance-locations", customerId],
    });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        address: draft.address.trim(),
        memo: draft.memo.trim() || undefined,
      };
      if (!payload.address) throw new Error("주소를 입력해 주세요.");
      if (editMode?.kind === "edit") {
        return updateCustomerFireInsuranceLocation(
          token!,
          customerId,
          editMode.locationId,
          payload,
        );
      }
      return createCustomerFireInsuranceLocation(token!, customerId, payload);
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
    mutationFn: async (location: CustomerFireInsuranceLocationRecord) => {
      await deleteCustomerFireInsuranceLocation(token!, customerId, location.id);
    },
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
      onExpandedChange(true);
    },
  });

  const openAdd = () => {
    setDraft(createEmptyFireInsuranceLocation());
    setError("");
    setEditMode({ kind: "add" });
  };

  const openEdit = (location: CustomerFireInsuranceLocationRecord) => {
    setDraft(customerFireInsuranceLocationRecordToFormItem(location));
    setError("");
    setEditMode({ kind: "edit", locationId: location.id });
  };

  const rows = locations ?? [];

  return (
    <>
      <CollapsibleDetailSection
        title="화재보험 정보"
        testID="customer-detail-section-fire-insurance"
        sectionId="fire"
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      >
        {loading ? (
          <AppText variant="body" color="textSecondary">화재보험 소재지를 불러오는 중…</AppText>
        ) : rows.length ? (
          rows.map((location, index) => (
            <SectionRowWithAction key={location.id} onEdit={() => openEdit(location)}>
              <Stack gap="xs">
                <DetailSubsectionLabel label={`소재지 ${index + 1}`} />
                <DetailRow label="주소" value={formatCustomerDetailValue(location.address)} />
                <DetailRow label="메모" value={formatCustomerDetailValue(location.memo)} />
              </Stack>
            </SectionRowWithAction>
          ))
        ) : (
          <AppText variant="body" color="textSecondary">등록된 화재보험 소재지가 없습니다.</AppText>
        )}
        <SectionAddAction label="+ 소재지 추가" onPress={openAdd} />
      </CollapsibleDetailSection>

      <CustomerSectionEditModal
        open={editMode != null}
        title={editMode?.kind === "edit" ? "소재지 수정" : "소재지 추가"}
        saving={saveMutation.isPending}
        onCancel={() => setEditMode(null)}
        onSave={() => saveMutation.mutate()}
      >
        <AddressSearchField
          value={parseAddressFromSave(draft.address)}
          onChange={(address) =>
            setDraft((prev) => ({ ...prev, address: formatAddressForSave(address) }))
          }
        />
        <TextField
          label="메모"
          multiline
          value={draft.memo}
          onChangeText={(value) => setDraft((prev) => ({ ...prev, memo: value }))}
        />
        {editMode?.kind === "edit" ? (
          <AppText
            variant="body"
            color="danger"
            onPress={() => {
              const target = rows.find((row) => row.id === editMode.locationId);
              if (target) {
                setEditMode(null);
                setDeleteTarget(target);
              }
            }}
          >
            소재지 삭제
          </AppText>
        ) : null}
        {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      </CustomerSectionEditModal>

      <ConfirmDialog
        open={deleteTarget != null}
        title="소재지를 삭제할까요?"
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
