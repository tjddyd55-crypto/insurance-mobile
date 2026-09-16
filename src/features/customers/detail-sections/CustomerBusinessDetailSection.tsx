import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../../auth/AuthProvider";
import { AddressSearchField } from "../../../components/AddressSearchField";
import { AppText, Stack, TextField, useAppTheme, type AppTheme } from "../../../design-system";
import {
  formatAddressForSave,
  parseAddressFromSave,
  type AddressSearchValue,
} from "../customerAddressSearch";
import {
  customerBusinessInfoToForm,
  formatBusinessNumberDisplay,
  isCustomerBusinessInfoEmpty,
  type CustomerBusinessInfo,
} from "../customerBusinessInfo";
import { formatCustomerDetailValue } from "../customerDetailPresentation";
import { CollapsibleDetailSection, DetailRow } from "../CollapsibleDetailSection";
import { updateCustomerBusinessInfo } from "../customersApi";
import { customerQueryKeys } from "../queryKeys";
import type { CustomerRecord } from "../types";
import { CustomerSectionEditModal } from "./CustomerSectionEditModal";
import { SectionAddAction, SectionEditAction } from "./CustomerSectionActions";
import { StyleSheet, View } from "react-native";

export function CustomerBusinessDetailSection({
  customer,
  expanded,
  onExpandedChange,
}: {
  customer: CustomerRecord;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const businessInfo = customer.businessInfo;
  const hasInfo = businessInfo != null && !isCustomerBusinessInfoEmpty(businessInfo);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<CustomerBusinessInfo>(() =>
    customerBusinessInfoToForm(businessInfo),
  );
  const [addressValue, setAddressValue] = useState<AddressSearchValue>(() =>
    parseAddressFromSave(customerBusinessInfoToForm(businessInfo).businessAddress),
  );
  const [error, setError] = useState("");

  const saveMutation = useMutation({
    mutationFn: async () => {
      const next = {
        representativeName: draft.representativeName.trim(),
        businessNumber: draft.businessNumber.trim(),
        businessAddress: formatAddressForSave(addressValue).trim(),
        memo: draft.memo.trim(),
      };
      return updateCustomerBusinessInfo(token, customer, next);
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(customerQueryKeys.detail(customer.id), updated);
      setOpen(false);
      setError("");
      onExpandedChange(true);
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "저장하지 못했습니다.");
    },
  });

  const openEditor = () => {
    const nextDraft = customerBusinessInfoToForm(businessInfo);
    setDraft(nextDraft);
    setAddressValue(parseAddressFromSave(nextDraft.businessAddress));
    setError("");
    setOpen(true);
  };

  return (
    <>
      <CollapsibleDetailSection
        title="사업자 정보"
        testID="customer-detail-section-business"
        sectionId="business"
        expanded={expanded}
        onExpandedChange={onExpandedChange}
      >
        {hasInfo ? (
          <View>
            <DetailRow
              label="대표자명"
              value={formatCustomerDetailValue(businessInfo!.representativeName)}
            />
            <DetailRow
              label="사업자번호"
              value={formatCustomerDetailValue(
                formatBusinessNumberDisplay(businessInfo!.businessNumber),
              )}
            />
            <DetailRow
              label="사업장 주소"
              value={formatCustomerDetailValue(businessInfo!.businessAddress)}
            />
            <DetailRow label="메모" value={formatCustomerDetailValue(businessInfo!.memo)} />
            <View style={styles.editBottom}>
              <SectionEditAction onPress={openEditor} />
            </View>
          </View>
        ) : (
          <>
            <AppText variant="body" color="textSecondary">
              등록된 사업자 정보가 없습니다.
            </AppText>
            <SectionAddAction label="+ 사업자 정보 등록" onPress={openEditor} />
          </>
        )}
      </CollapsibleDetailSection>

      <CustomerSectionEditModal
        open={open}
        title={hasInfo ? "사업자 정보 수정" : "사업자 정보 등록"}
        saving={saveMutation.isPending}
        onCancel={() => setOpen(false)}
        onSave={() => saveMutation.mutate()}
      >
        <TextField
          label="대표자명"
          value={draft.representativeName}
          onChangeText={(value) => setDraft((prev) => ({ ...prev, representativeName: value }))}
        />
        <TextField
          label="사업자번호"
          value={draft.businessNumber}
          onChangeText={(value) => setDraft((prev) => ({ ...prev, businessNumber: value }))}
        />
        <AddressSearchField value={addressValue} onChange={setAddressValue} />
        <TextField
          label="메모"
          multiline
          value={draft.memo}
          onChangeText={(value) => setDraft((prev) => ({ ...prev, memo: value }))}
        />
        {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
      </CustomerSectionEditModal>
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    editBottom: {
      alignItems: "flex-end",
      paddingTop: theme.spacing.sm,
    },
  });
}
