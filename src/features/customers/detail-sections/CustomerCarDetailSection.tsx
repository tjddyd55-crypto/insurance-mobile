import { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../auth/AuthProvider";
import { ConfirmDialog } from "../../../components/ConfirmDialog";
import { AppText, Inline, Stack, TextField, useAppTheme, type AppTheme } from "../../../design-system";
import {
  createCustomerCar,
  deleteCustomerCar,
  updateCustomerCar,
  type CustomerCarRecord,
} from "../customerCarsApi";
import { customerCarRecordToFormItem, createEmptyCustomerCar, type CustomerCarFormItem } from "../customerCarsModel";
import { formatCustomerDetailDate } from "../customerDetailPresentation";
import { CollapsibleDetailSection } from "../CollapsibleDetailSection";
import type { CustomerRecord } from "../types";
import { CustomerSectionEditModal } from "./CustomerSectionEditModal";
import { SectionAddAction, SectionRowWithAction } from "./CustomerSectionActions";

type EditMode = { kind: "add" } | { kind: "edit"; carId: number };

export function CustomerCarDetailSection({
  customer,
  cars,
  loading,
  expanded,
  onExpandedChange,
}: {
  customer: CustomerRecord;
  cars: CustomerCarRecord[] | undefined;
  loading: boolean;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [editMode, setEditMode] = useState<EditMode | null>(null);
  const [draft, setDraft] = useState<CustomerCarFormItem>(() => createEmptyCustomerCar());
  const [deleteTarget, setDeleteTarget] = useState<CustomerCarRecord | null>(null);
  const [error, setError] = useState("");

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["customer-cars", customer.id] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        carNumber: draft.carNumber.trim(),
        carModel: draft.carModel.trim() || draft.carType.trim(),
        carType: draft.carType.trim(),
        carYear: draft.carYear.trim(),
        renewalDate: draft.renewalDate.trim(),
        memo: draft.memo.trim() || undefined,
        isPrimary: draft.isPrimary,
      };
      if (!payload.carNumber) throw new Error("차량 번호를 입력해 주세요.");
      if (editMode?.kind === "edit") {
        return updateCustomerCar(token, customer.id, editMode.carId, payload);
      }
      const existing = cars ?? [];
      return createCustomerCar(token, customer.id, {
        ...payload,
        isPrimary: existing.length === 0,
      });
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
    mutationFn: async (car: CustomerCarRecord) => {
      await deleteCustomerCar(token, customer.id, car.id);
    },
    onSuccess: async () => {
      await invalidate();
      setDeleteTarget(null);
      onExpandedChange(true);
    },
  });

  const openAdd = () => {
    setDraft(createEmptyCustomerCar());
    setError("");
    setEditMode({ kind: "add" });
  };

  const openEdit = (car: CustomerCarRecord) => {
    setDraft(customerCarRecordToFormItem(car));
    setError("");
    setEditMode({ kind: "edit", carId: car.id });
  };

  const displayCars = cars?.length
    ? cars
    : customer.carNumber
      ? [
          {
            id: 0,
            customerId: customer.id,
            carNumber: customer.carNumber,
            carType: customer.carType,
            carModel: customer.carModel,
            carYear: customer.carYear,
            renewalDate: customer.renewalDate,
            memo: "",
            isPrimary: true,
            sortOrder: 0,
            createdAt: "",
            updatedAt: "",
          } satisfies CustomerCarRecord,
        ]
      : [];

  return (
    <>
      <CollapsibleDetailSection
        title="자동차 정보"
        testID="customer-detail-section-vehicle"
        sectionId="car"
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      >
        {loading ? (
          <AppText variant="body" color="textSecondary">차량 정보를 불러오는 중…</AppText>
        ) : displayCars.length ? (
          displayCars.map((car, index) => (
            <SectionRowWithAction key={car.id || `legacy-${index}`} onEdit={() => openEdit(car)}>
              <Stack gap="xs">
                <AppText variant="bodyStrong">{car.carNumber || `차량 ${index + 1}`}</AppText>
                <AppText variant="body" color="textSecondary">
                  {[car.carType || car.carModel, car.carYear ? `${car.carYear}년` : ""]
                    .filter(Boolean)
                    .join(" · ")}
                </AppText>
                {car.renewalDate ? (
                  <AppText variant="caption" color="textSecondary">
                    갱신일 {formatCustomerDetailDate(car.renewalDate)}
                  </AppText>
                ) : null}
              </Stack>
            </SectionRowWithAction>
          ))
        ) : (
          <AppText variant="body" color="textSecondary">등록된 차량이 없습니다.</AppText>
        )}
        <SectionAddAction label="+ 차량 추가" onPress={openAdd} />
      </CollapsibleDetailSection>

      <CustomerSectionEditModal
        open={editMode != null}
        title={editMode?.kind === "edit" ? "차량 수정" : "차량 추가"}
        saving={saveMutation.isPending}
        onCancel={() => setEditMode(null)}
        onSave={() => saveMutation.mutate()}
      >
        <TextField
          label="차량 번호"
          value={draft.carNumber}
          onChangeText={(value) => setDraft((prev) => ({ ...prev, carNumber: value }))}
        />
        <TextField
          label="차종"
          value={draft.carType}
          onChangeText={(value) => setDraft((prev) => ({ ...prev, carType: value }))}
        />
        <Inline gap="sm">
          <TextField
            label="연식"
            value={draft.carYear}
            keyboardType="number-pad"
            onChangeText={(value) => setDraft((prev) => ({ ...prev, carYear: value }))}
            containerStyle={styles.grow}
          />
          <TextField
            label="갱신 예정일"
            value={draft.renewalDate}
            placeholder="YYYY-MM-DD"
            onChangeText={(value) => setDraft((prev) => ({ ...prev, renewalDate: value }))}
            containerStyle={styles.grow}
          />
        </Inline>
        {editMode?.kind === "edit" && editMode.carId > 0 ? (
          <View style={styles.deleteRow}>
            <AppText
              variant="body"
              color="danger"
              onPress={() => {
                const target = cars?.find((row) => row.id === editMode.carId);
                if (target) {
                  setEditMode(null);
                  setDeleteTarget(target);
                }
              }}
            >
              차량 삭제
            </AppText>
          </View>
        ) : null}
        {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      </CustomerSectionEditModal>

      <ConfirmDialog
        open={deleteTarget != null}
        title="차량을 삭제할까요?"
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
    grow: { flex: 1, minWidth: 0 },
    deleteRow: { paddingTop: theme.spacing.sm },
  });
}
