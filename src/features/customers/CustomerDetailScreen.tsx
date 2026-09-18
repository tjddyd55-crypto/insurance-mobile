import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "../../auth/AuthProvider";
import { AppHeader } from "../../components/AppHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import {
  AppText,
  Button,
  Inline,
  Stack,
  useAppTheme,
  useBottomSafeInset,
  type AppTheme,
} from "../../design-system";
import { formatCustomerPhone } from "./customerModel";
import {
  formatCustomerBodySize,
  formatCustomerDetailDate,
  formatCustomerDetailValue,
  formatCustomerDriver,
} from "./customerDetailPresentation";
import { CustomerSsnDetailRow } from "./CustomerSsnDetailRow";
import { formatCustomerMobileCarrierDisplay } from "./customerCarrier";
import { buildKakaoCustomerCopyText } from "./customerCopyText";
import { listCustomerCars } from "./customerCarsApi";
import { listCustomerSpecialDates } from "./customerSpecialDatesApi";
import { listCustomerCustomFields } from "./customerCustomFieldsApi";
import { formatCustomerInflowSourceDisplay } from "./customerInflowSource";
import { listCustomerFireInsuranceLocations } from "./customerFireInsuranceLocationsApi";
import { deleteCustomer, getCustomer, setCustomerFavorite } from "./customersApi";
import { customerQueryKeys } from "./queryKeys";
import type { ListCustomersResult } from "./types";
import { CustomerActionIcon } from "./CustomerActionIcon";
import { CustomerDetailTaskPanel } from "./CustomerDetailTaskPanel";
import { CustomerGaDataModal } from "./CustomerGaDataModal";
import { CustomerRelationsPanel } from "./CustomerRelationsPanel";
import {
  CollapsibleDetailSection,
  DetailRow,
  DetailSubsectionLabel,
} from "./CollapsibleDetailSection";
import { CustomerAlertDatesDetailSection } from "./detail-sections/CustomerAlertDatesDetailSection";
import { CustomerBusinessDetailSection } from "./detail-sections/CustomerBusinessDetailSection";
import { CustomerCarDetailSection } from "./detail-sections/CustomerCarDetailSection";
import { CustomerFireInsuranceDetailSection } from "./detail-sections/CustomerFireInsuranceDetailSection";
import { CustomerBasicInlineCustomFields } from "./detail-sections/CustomerBasicInlineCustomFields";
import { SectionEditAction } from "./detail-sections/CustomerSectionActions";
import type { CustomerSectionId } from "./customerSectionTheme";
import {
  CustomerContactIconButton,
  openPhoneUrl,
} from "./CustomerContactIconButton";
import { useGoBackFromCustomerDetail } from "./customerWorkspaceNavigation";
import {
  buildCustomerWorkspaceActions,
  resolveCustomerWorkspaceActionHref,
  type CustomerWorkspaceActionId,
} from "./customerWorkspaceActions";
import {
  closeCustomerDeleteConfirm,
  isCustomerDeleteConfirmVisible,
  openCustomerDeleteConfirm,
  resetCustomerDeleteConfirmForCustomerChange,
  resolveCustomerDeleteTargetId,
  type CustomerDeleteConfirmState,
} from "./customerDeleteConfirmState";
type CustomerDetailScreenProps = { customerId: number };

function phoneUrl(phone: string, scheme: "tel" | "sms"): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `${scheme}:${digits}` : null;
}

export function CustomerDetailScreen({ customerId }: CustomerDetailScreenProps) {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const bottomInset = useBottomSafeInset();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const queryKey = customerQueryKeys.detail(customerId);
  const onBackFromDetail = useGoBackFromCustomerDetail();
  const [deleteConfirm, setDeleteConfirm] = useState<CustomerDeleteConfirmState>(
    closeCustomerDeleteConfirm(),
  );

  useEffect(() => {
    setDeleteConfirm(resetCustomerDeleteConfirmForCustomerChange());
  }, [customerId]);
  const [gaOpen, setGaOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [sectionExpanded, setSectionExpanded] = useState<Partial<Record<CustomerSectionId, boolean>>>(
    {},
  );
  const isSectionExpanded = (id: CustomerSectionId, defaultExpanded: boolean) =>
    sectionExpanded[id] ?? defaultExpanded;
  const setSectionExpandedState = (id: CustomerSectionId, expanded: boolean) => {
    setSectionExpanded((previous) => ({ ...previous, [id]: expanded }));
  };
  const query = useQuery({
    queryKey,
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token) && Number.isInteger(customerId) && customerId > 0,
  });
  const carsQuery = useQuery({
    queryKey: ["customer-cars", customerId],
    queryFn: () => listCustomerCars(token, customerId),
    enabled: Boolean(token) && Boolean(query.data),
  });
  const specialDatesQuery = useQuery({
    queryKey: ["customer-special-dates", customerId],
    queryFn: () => listCustomerSpecialDates(token, customerId),
    enabled: Boolean(token) && Boolean(query.data),
  });
  const customFieldsQuery = useQuery({
    queryKey: ["customer-custom-fields", customerId],
    queryFn: () => listCustomerCustomFields(token, customerId),
    enabled: Boolean(token) && Boolean(query.data),
  });
  const fireLocationsQuery = useQuery({
    queryKey: ["customer-fire-insurance-locations", customerId],
    queryFn: () => listCustomerFireInsuranceLocations(token, customerId),
    enabled: Boolean(token) && Boolean(query.data),
  });
  const favoriteMutation = useMutation({
    mutationFn: (isFavorite: boolean) => setCustomerFavorite(token, customerId, isFavorite),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      queryClient.setQueryData<ListCustomersResult>(customerQueryKeys.all, (previous) =>
        previous
          ? {
              ...previous,
              customers: previous.customers.map((customer) =>
                customer.id === updated.id ? updated : customer,
              ),
            }
          : previous,
      );
    },
  });
  const deleteMutation = useMutation({
    mutationFn: (idToDelete: number) => deleteCustomer(token, idToDelete),
    onSuccess: (_data, idToDelete) => {
      setDeleteConfirm(closeCustomerDeleteConfirm());
      queryClient.removeQueries({ queryKey: customerQueryKeys.detail(idToDelete) });
      queryClient.setQueryData<ListCustomersResult>(customerQueryKeys.all, (previous) =>
        previous
          ? {
              total: Math.max(0, previous.total - 1),
              customers: previous.customers.filter((item) => item.id !== idToDelete),
            }
          : previous,
      );
      router.replace("/customers");
    },
  });

  const customer = query.data;
  const telUrl = customer ? phoneUrl(customer.phone, "tel") : null;
  const smsUrl = customer ? phoneUrl(customer.phone, "sms") : null;
  const actions = customer ? buildCustomerWorkspaceActions(customer.name) : [];

  const handleAction = async (actionId: CustomerWorkspaceActionId) => {
    if (!customer) return;
    if (actionId === "copy") {
      await Clipboard.setStringAsync(buildKakaoCustomerCopyText(customer));
      setCopyNotice("고객 정보를 복사했습니다.");
      return;
    }
    if (actionId === "gaData") {
      setGaOpen(true);
      return;
    }
    const href = resolveCustomerWorkspaceActionHref(customer.id, actionId);
    if (href) router.push(href);
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title={customer?.name ?? "고객 상세"}
        showMenu={false}
        showBack
        onBackPress={onBackFromDetail}
        rightAction={
          customer ? (
            <Inline gap="none" align="center">
              <CustomerActionIcon
                kind="star"
                active={customer.isFavorite}
                disabled={favoriteMutation.isPending}
                accessibilityLabel={customer.isFavorite ? "중요 고객 해제" : "중요 고객"}
                onPress={() => favoriteMutation.mutate(!customer.isFavorite)}
              />
              <CustomerContactIconButton
                kind="sms"
                disabled={!smsUrl || customer.smsOptOut}
                accessibilityLabel={
                  customer.smsOptOut
                    ? `${customer.name} 고객 문자 수신 거부`
                    : `${customer.name} 고객에게 문자`
                }
                onPress={() => openPhoneUrl(smsUrl)}
              />
              <CustomerContactIconButton
                kind="tel"
                disabled={!telUrl}
                accessibilityLabel={`${customer.name} 고객에게 전화`}
                onPress={() => openPhoneUrl(telUrl)}
              />
            </Inline>
          ) : null
        }
      />
      <View style={[styles.body, { paddingBottom: bottomInset }]}>
        {query.isLoading ? (
          <LoadingState message="고객 정보를 불러오는 중…" />
        ) : query.isError || !customer ? (
          <ErrorState
            title="고객 정보를 불러오지 못했습니다"
            message={query.error instanceof Error ? query.error.message : "고객을 찾을 수 없습니다."}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <ScrollView
            testID="customer-detail-scroll"
            style={styles.scroll}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: theme.layout.contentBottomInset },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => {
                  void Promise.all([
                    query.refetch(),
                    carsQuery.refetch(),
                    fireLocationsQuery.refetch(),
                    specialDatesQuery.refetch(),
                    customFieldsQuery.refetch(),
                    queryClient.invalidateQueries({
                      queryKey: ["customer-relation-groups", customerId],
                    }),
                    queryClient.invalidateQueries({
                      queryKey: ["customer-relations", customerId],
                    }),
                  ]);
                }}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >

            <CustomerDetailTaskPanel
              customerId={customer.id}
              customerName={customer.name}
              customerPhone={customer.phone}
              actions={actions}
              onAction={(actionId) => void handleAction(actionId)}
              copyNotice={copyNotice}
            />

            <CollapsibleDetailSection
              title="기본 정보"
              testID="customer-detail-section-basic"
              sectionId="basic"
              defaultExpanded
            >
              <DetailRow label="이름" value={formatCustomerDetailValue(customer.name)} />
              <DetailRow
                label="연락처"
                value={formatCustomerDetailValue(
                  customer.phone ? formatCustomerPhone(customer.phone) : "",
                )}
              />
              <CustomerSsnDetailRow customerId={customer.id} ssn={customer.ssn} />
              <DetailRow label="상령일" value={formatCustomerDetailDate(customer.nextAgeDate)} />
              <DetailRow
                label="보험나이"
                value={
                  customer.insuranceAge != null
                    ? `${customer.insuranceAge}세`
                    : formatCustomerDetailValue("")
                }
              />
              <DetailRow label="문자 수신" value={customer.smsOptOut ? "수신 거부" : "수신 허용"} />
              <DetailRow
                label="통신사"
                value={formatCustomerDetailValue(
                  formatCustomerMobileCarrierDisplay(customer.carrier),
                )}
              />
              <DetailRow label="주소" value={formatCustomerDetailValue(customer.address)} />
              <DetailRow label="키 / 몸무게" value={formatCustomerBodySize(customer)} />
              <DetailRow label="직업·회사·지역" value={formatCustomerDetailValue(customer.job)} />
              <DetailRow label="운전 여부" value={formatCustomerDriver(customer)} />
              <DetailRow
                label="유입 경로"
                value={formatCustomerInflowSourceDisplay(
                  customer.inflowSource,
                  customer.referrerName,
                )}
              />

              <DetailSubsectionLabel label="건강/보험 참고" />
              <DetailRow
                label="수술·치료 관련"
                value={formatCustomerDetailValue(customer.notes.treatmentHistoryNote)}
              />
              <DetailRow
                label="약 복용 관련"
                value={formatCustomerDetailValue(customer.notes.medicationHistoryNote)}
              />

              <DetailSubsectionLabel label="보험 가입" />
              <DetailRow
                label="보험 가입 내역"
                value={formatCustomerDetailValue(customer.notes.insuranceHistory)}
              />

              <DetailSubsectionLabel label="계좌" />
              <DetailRow
                label="계좌 정보"
                value={formatCustomerDetailValue(customer.notes.accountNumber)}
              />
              <CustomerBasicInlineCustomFields
                customerId={customer.id}
                items={customFieldsQuery.data}
                loading={customFieldsQuery.isLoading}
              />
              <View style={styles.basicEditAction}>
                <SectionEditAction
                  label="수정하기"
                  onPress={() =>
                    router.push({
                      pathname: "/customers/[customerId]/edit",
                      params: { customerId: String(customer.id) },
                    })
                  }
                />
              </View>
            </CollapsibleDetailSection>

            <CustomerCarDetailSection
              customer={customer}
              cars={carsQuery.data}
              loading={carsQuery.isLoading}
              expanded={isSectionExpanded("car", false)}
              onExpandedChange={(expanded) => setSectionExpandedState("car", expanded)}
            />

            <CustomerRelationsPanel customerId={customer.id} />

            <CustomerFireInsuranceDetailSection
              customerId={customer.id}
              locations={fireLocationsQuery.data}
              loading={fireLocationsQuery.isLoading}
              expanded={isSectionExpanded("fire", false)}
              onExpandedChange={(expanded) => setSectionExpandedState("fire", expanded)}
            />

            <CustomerBusinessDetailSection
              customer={customer}
              expanded={isSectionExpanded("business", false)}
              onExpandedChange={(expanded) => setSectionExpandedState("business", expanded)}
            />

            <CustomerAlertDatesDetailSection
              customerId={customer.id}
              items={specialDatesQuery.data}
              loading={specialDatesQuery.isLoading}
              expanded={isSectionExpanded("anniversary", false)}
              onExpandedChange={(expanded) => setSectionExpandedState("anniversary", expanded)}
            />

            <Stack gap="sm" style={styles.bottomActions} testID="customer-detail-bottom-actions">
              <Button
                accessibilityLabel={`${customer.name} 고객 삭제`}
                label="고객 삭제"
                variant="danger"
                onPress={() => setDeleteConfirm(openCustomerDeleteConfirm(customer.id))}
              />
              {deleteMutation.isError ? (
                <AppText variant="caption" color="danger">
                  {deleteMutation.error instanceof Error
                    ? deleteMutation.error.message
                    : "고객을 삭제하지 못했습니다."}
                </AppText>
              ) : null}
            </Stack>
          </ScrollView>
        )}
      </View>
      <CustomerGaDataModal
        open={gaOpen}
        customerId={customerId}
        customerName={customer?.name ?? "고객"}
        onClose={() => setGaOpen(false)}
      />
      <ConfirmDialog
        open={isCustomerDeleteConfirmVisible(deleteConfirm, customerId)}
        title="고객 삭제"
        message={`${customer?.name ?? "이 고객"}의 정보와 연결된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteConfirm(closeCustomerDeleteConfirm())}
        onConfirm={() => {
          const idToDelete = resolveCustomerDeleteTargetId(deleteConfirm);
          if (idToDelete == null || deleteMutation.isPending) return;
          void deleteMutation.mutateAsync(idToDelete);
        }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    body: { flex: 1 },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    bottomActions: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    basicEditAction: {
      alignItems: "flex-end",
      paddingTop: theme.spacing.sm,
    },
  });
}
