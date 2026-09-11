import { useMemo, useState } from "react";
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
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { formatCustomerPhone } from "./customerModel";
import {
  formatCustomerBodySize,
  formatCustomerDetailDate,
  formatCustomerDetailValue,
  formatCustomerDriver,
  formatCustomerSsn,
} from "./customerDetailPresentation";
import { formatCustomerMobileCarrierDisplay } from "./customerCarrier";
import { buildKakaoCustomerCopyText } from "./customerCopyText";
import { listCustomerCars } from "./customerCarsApi";
import {
  CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS,
  listCustomerSpecialDates,
} from "./customerSpecialDatesApi";
import { formatBusinessNumberDisplay } from "./customerBusinessInfo";
import { formatCustomerInflowSourceDisplay } from "./customerInflowSource";
import { listCustomerFireInsuranceLocations } from "./customerFireInsuranceLocationsApi";
import { deleteCustomer, getCustomer, setCustomerFavorite } from "./customersApi";
import { customerQueryKeys } from "./queryKeys";
import type { ListCustomersResult } from "./types";
import { CustomerAppLinkSection } from "./CustomerAppLinkSection";
import { CustomerGaDataModal } from "./CustomerGaDataModal";
import { CustomerRelationsPanel } from "./CustomerRelationsPanel";
import { CustomerWorkspaceActionGrid } from "./CustomerWorkspaceActionGrid";
import { VehicleInfoGrid } from "./VehicleInfoGrid";
import {
  CollapsibleDetailSection,
  DetailRow,
  DetailSubsectionLabel,
} from "./CollapsibleDetailSection";
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
import { listConsultations } from "../customer-workspace/customerWorkspaceApi";
import {
  consultationPreviewDate,
  selectRecentConsultations,
} from "../customer-workspace/customerWorkspaceModel";

type CustomerDetailScreenProps = { customerId: number };

function phoneUrl(phone: string, scheme: "tel" | "sms"): string | null {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? `${scheme}:${digits}` : null;
}

export function CustomerDetailScreen({ customerId }: CustomerDetailScreenProps) {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const queryKey = customerQueryKeys.detail(customerId);
  const onBackFromDetail = useGoBackFromCustomerDetail();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [gaOpen, setGaOpen] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
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
  const fireLocationsQuery = useQuery({
    queryKey: ["customer-fire-insurance-locations", customerId],
    queryFn: () => listCustomerFireInsuranceLocations(token, customerId),
    enabled: Boolean(token) && Boolean(query.data),
  });
  const consultationsQuery = useQuery({
    queryKey: ["customer-consultations", customerId],
    queryFn: () => listConsultations(token, customerId),
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
    mutationFn: () => deleteCustomer(token, customerId),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey });
      queryClient.setQueryData<ListCustomersResult>(customerQueryKeys.all, (previous) =>
        previous
          ? {
              total: Math.max(0, previous.total - 1),
              customers: previous.customers.filter((item) => item.id !== customerId),
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
  const recentConsultations = useMemo(
    () => selectRecentConsultations(consultationsQuery.data ?? []),
    [consultationsQuery.data],
  );

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
            <Inline gap="xs" align="center">
              <Button
                accessibilityLabel={customer.isFavorite ? "중요 고객 해제" : "중요 고객"}
                label={customer.isFavorite ? "★" : "☆"}
                size="sm"
                variant="ghost"
                disabled={favoriteMutation.isPending}
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
      {query.isLoading ? (
        <LoadingState message="고객 정보를 불러오는 중…" />
      ) : query.isError || !customer ? (
        <ErrorState
          title="고객 정보를 불러오지 못했습니다"
          message={query.error instanceof Error ? query.error.message : "고객을 찾을 수 없습니다."}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <Screen padded={false}>
          <ScrollView
            testID="customer-detail-scroll"
            style={styles.scroll}
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                refreshing={query.isRefetching}
                onRefresh={() => {
                  void Promise.all([
                    query.refetch(),
                    carsQuery.refetch(),
                    fireLocationsQuery.refetch(),
                    specialDatesQuery.refetch(),
                    consultationsQuery.refetch(),
                    queryClient.invalidateQueries({
                      queryKey: ["customer-relation-groups", customerId],
                    }),
                    queryClient.invalidateQueries({
                      queryKey: ["customer-relations", customerId],
                    }),
                    queryClient.invalidateQueries({
                      queryKey: ["customer-consultations", customerId],
                    }),
                  ]);
                }}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >

            <CustomerAppLinkSection
              customerId={customer.id}
              customerName={customer.name}
              customerPhone={customer.phone}
            />

            <CollapsibleDetailSection
              title="고객 업무"
              testID="customer-detail-section-actions"
              sectionId="actions"
              defaultExpanded
            >
              <CustomerWorkspaceActionGrid
                actions={actions}
                onAction={(actionId) => void handleAction(actionId)}
              />
              {copyNotice ? (
                <AppText variant="body" color="success">
                  {copyNotice}
                </AppText>
              ) : null}
            </CollapsibleDetailSection>

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
              <DetailRow label="주민번호" value={formatCustomerSsn(customer.ssn)} />
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
            </CollapsibleDetailSection>

            <CollapsibleDetailSection
              title="자동차 정보"
              testID="customer-detail-section-vehicle"
              sectionId="car"
              defaultExpanded={false}
            >
              {carsQuery.isLoading ? (
                <AppText variant="body" color="textSecondary">차량 정보를 불러오는 중…</AppText>
              ) : carsQuery.data?.length ? (
                carsQuery.data.map((car, index) => (
                  <Stack key={car.id} gap="xs" style={styles.subBlock}>
                    <AppText variant="bodyStrong">
                      {car.isPrimary ? "대표 차량" : `차량 ${index + 1}`}
                    </AppText>
                    <VehicleInfoGrid
                      values={{
                        carNumber: car.carNumber,
                        carType: car.carType,
                        carYear: car.carYear,
                        renewalDate: car.renewalDate,
                      }}
                    />
                  </Stack>
                ))
              ) : (
                <VehicleInfoGrid
                  values={{
                    carNumber: customer.carNumber,
                    carType: customer.carType,
                    carYear: customer.carYear,
                    renewalDate: customer.renewalDate,
                  }}
                />
              )}
            </CollapsibleDetailSection>

            <CustomerRelationsPanel customerId={customer.id} />

            <CollapsibleDetailSection
              title="사업자 정보"
              testID="customer-detail-section-business"
              sectionId="business"
              defaultExpanded={false}
            >
              {customer.businessInfo ? (
                <>
                  <DetailRow
                    label="대표자명"
                    value={formatCustomerDetailValue(customer.businessInfo.representativeName)}
                  />
                  <DetailRow
                    label="사업자번호"
                    value={formatCustomerDetailValue(
                      formatBusinessNumberDisplay(customer.businessInfo.businessNumber),
                    )}
                  />
                  <DetailRow
                    label="사업장 주소"
                    value={formatCustomerDetailValue(customer.businessInfo.businessAddress)}
                  />
                  <DetailRow
                    label="메모"
                    value={formatCustomerDetailValue(customer.businessInfo.memo)}
                  />
                </>
              ) : (
                <AppText variant="body" color="textSecondary">등록된 사업자 정보가 없습니다.</AppText>
              )}
            </CollapsibleDetailSection>

            <CollapsibleDetailSection
              title="화재보험 정보"
              testID="customer-detail-section-fire-insurance"
              sectionId="fire"
              defaultExpanded={false}
            >
              {fireLocationsQuery.isLoading ? (
                <AppText variant="body" color="textSecondary">화재보험 소재지를 불러오는 중…</AppText>
              ) : (fireLocationsQuery.data ?? []).length > 0 ? (
                (fireLocationsQuery.data ?? []).map((location, index) => (
                  <Stack key={location.id} gap="xs" style={styles.subBlock}>
                    <DetailSubsectionLabel label={`소재지 ${index + 1}`} />
                    <DetailRow label="주소" value={formatCustomerDetailValue(location.address)} />
                    <DetailRow label="메모" value={formatCustomerDetailValue(location.memo)} />
                  </Stack>
                ))
              ) : (
                <AppText variant="body" color="textSecondary">등록된 화재보험 소재지가 없습니다.</AppText>
              )}
            </CollapsibleDetailSection>

            <CollapsibleDetailSection
              title="기념일"
              testID="customer-detail-section-special-dates"
              sectionId="anniversary"
              defaultExpanded={false}
            >
              {specialDatesQuery.isLoading ? (
                <AppText variant="body" color="textSecondary">기념일을 불러오는 중…</AppText>
              ) : specialDatesQuery.data?.length ? (
                specialDatesQuery.data.map((item) => (
                  <DetailRow
                    key={item.id}
                    label={`${CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS[item.purposeType]} · ${item.title}`}
                    value={formatCustomerDetailDate(item.dateValue)}
                  />
                ))
              ) : (
                <AppText variant="body" color="textSecondary">등록된 기념일이 없습니다.</AppText>
              )}
            </CollapsibleDetailSection>

            <CollapsibleDetailSection
              title="상담"
              testID="customer-detail-section-consultation"
              sectionId="consultation"
              defaultExpanded={false}
            >
              {consultationsQuery.isLoading ? (
                <AppText variant="body" color="textSecondary">상담 기록을 불러오는 중…</AppText>
              ) : recentConsultations.length ? (
                recentConsultations.map((row) => (
                  <Stack key={row.id} gap="xs" style={styles.subBlock}>
                    <AppText variant="bodyStrong">{consultationPreviewDate(row)}</AppText>
                    <AppText color="textSecondary">
                      {formatCustomerDetailValue(row.body)}
                    </AppText>
                  </Stack>
                ))
              ) : (
                <AppText variant="body" color="textSecondary">등록된 상담 기록이 없습니다.</AppText>
              )}
              <Button
                accessibilityLabel={`${customer.name} 전체 상담 보기`}
                label="전체 상담 보기"
                size="sm"
                variant="secondary"
                onPress={() =>
                  router.push({
                    pathname: "/customers/[customerId]/consultations",
                    params: { customerId: String(customer.id) },
                  })
                }
                style={styles.fullWidthAction}
              />
            </CollapsibleDetailSection>

            <Stack gap="sm" style={styles.bottomActions} testID="customer-detail-bottom-actions">
              <Button
                accessibilityLabel={`${customer.name} 고객 정보 수정`}
                label="정보 수정"
                variant="action"
                onPress={() =>
                  router.push({
                    pathname: "/customers/[customerId]/edit",
                    params: { customerId: String(customer.id) },
                  })
                }
              />
              <Button
                accessibilityLabel={`${customer.name} 고객 삭제`}
                label="고객 삭제"
                variant="danger"
                onPress={() => setDeleteOpen(true)}
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
        </Screen>
      )}
      <CustomerGaDataModal
        open={gaOpen}
        customerId={customerId}
        customerName={customer?.name ?? "고객"}
        onClose={() => setGaOpen(false)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="고객 삭제"
        message={`${customer?.name ?? "이 고객"}의 정보와 연결된 데이터를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={() => deleteMutation.mutateAsync()}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: theme.spacing.md,
      paddingTop: theme.spacing.md,
      paddingBottom: theme.layout.contentBottomInset,
      gap: theme.spacing.sm,
    },
    grow: { flex: 1 },
    fullWidthAction: { alignSelf: "stretch", marginTop: theme.spacing.sm },
    bottomActions: {
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
    },
    subBlock: {
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
  });
}
