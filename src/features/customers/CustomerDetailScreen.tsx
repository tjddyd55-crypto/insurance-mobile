import { useMemo, useState } from "react";
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
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
  Badge,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { customerGenderLabel, formatCustomerPhone } from "./customerModel";
import {
  formatCustomerBodySize,
  formatCustomerDetailDate,
  formatCustomerDetailValue,
  formatCustomerDriver,
  formatCustomerSsn,
  getCustomerFollowUpPresentation,
} from "./customerDetailPresentation";
import { formatCustomerMobileCarrierDisplay } from "./customerCarrier";
import { buildKakaoCustomerCopyText } from "./customerCopyText";
import { listCustomerCars } from "./customerCarsApi";
import { listCustomerRelations } from "./customerRelationsApi";
import {
  CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS,
  listCustomerSpecialDates,
} from "./customerSpecialDatesApi";
import { formatCustomerInflowSourceDisplay } from "./customerInflowSource";
import { deleteCustomer, getCustomer, setCustomerFavorite } from "./customersApi";
import { customerQueryKeys } from "./queryKeys";
import type { ListCustomersResult } from "./types";
import { CustomerAppLinkSection } from "./CustomerAppLinkSection";
import { CustomerGaDataModal } from "./CustomerGaDataModal";
import { CustomerWorkspaceActionGrid } from "./CustomerWorkspaceActionGrid";
import {
  CollapsibleDetailSection,
  DetailRow,
} from "./CollapsibleDetailSection";
import {
  buildCustomerWorkspaceActions,
  resolveCustomerWorkspaceActionHref,
  type CustomerWorkspaceActionId,
} from "./customerWorkspaceActions";

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
  const relationsQuery = useQuery({
    queryKey: ["customer-relations", customerId],
    queryFn: () => listCustomerRelations(token, customerId),
    enabled: Boolean(token) && Boolean(query.data),
  });
  const specialDatesQuery = useQuery({
    queryKey: ["customer-special-dates", customerId],
    queryFn: () => listCustomerSpecialDates(token, customerId),
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
  const followUp = customer ? getCustomerFollowUpPresentation(customer) : null;
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
      <AppHeader title={customer?.name ?? "고객 상세"} showMenu={false} showBack />
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
                    relationsQuery.refetch(),
                    specialDatesQuery.refetch(),
                  ]);
                }}
                colors={[theme.colors.primary]}
                tintColor={theme.colors.primary}
              />
            }
          >
            <Card variant="outlined" padding="sm" testID="customer-detail-identity">
              <Stack gap="sm">
                <Inline justify="space-between" align="flex-start">
                  <Stack gap="xs" style={styles.grow}>
                    <Inline gap="xs" wrap>
                      <AppText variant="title" style={styles.customerName}>
                        {customer.name}
                      </AppText>
                      {customer.customerCode ? <Badge label={customer.customerCode} /> : null}
                    </Inline>
                    <AppText color="textSecondary">
                      {customer.phone ? formatCustomerPhone(customer.phone) : "연락처 없음"}
                    </AppText>
                    <Inline gap="xs" wrap>
                      <AppText variant="helper">
                        {customerGenderLabel(customer.gender)}
                        {customer.insuranceAge != null ? ` · 보험나이 ${customer.insuranceAge}세` : ""}
                      </AppText>
                      {customer.isFavorite ? <Badge label="중요 고객" tone="warning" /> : null}
                      {followUp ? <Badge label={followUp.label} tone={followUp.tone} /> : null}
                    </Inline>
                  </Stack>
                  <Button
                    accessibilityLabel={customer.isFavorite ? "중요 고객 해제" : "중요 고객"}
                    label={customer.isFavorite ? "★" : "☆"}
                    size="sm"
                    variant="ghost"
                    disabled={favoriteMutation.isPending}
                    onPress={() => favoriteMutation.mutate(!customer.isFavorite)}
                  />
                </Inline>
                <Inline>
                  <Button
                    accessibilityLabel={`${customer.name} 고객에게 전화`}
                    label="전화"
                    size="sm"
                    variant="secondary"
                    disabled={!telUrl}
                    onPress={() => telUrl && void Linking.openURL(telUrl)}
                    style={styles.grow}
                  />
                  <Button
                    accessibilityLabel={
                      customer.smsOptOut
                        ? `${customer.name} 고객 문자 수신 거부`
                        : `${customer.name} 고객에게 문자`
                    }
                    label={customer.smsOptOut ? "문자 수신거부" : "문자"}
                    size="sm"
                    variant="secondary"
                    disabled={!smsUrl || customer.smsOptOut}
                    onPress={() => smsUrl && void Linking.openURL(smsUrl)}
                    style={styles.grow}
                  />
                </Inline>
              </Stack>
            </Card>

            <Stack gap="sm" testID="customer-detail-app-link">
              <AppText variant="sectionTitle">고객앱</AppText>
              <CustomerAppLinkSection
                customerId={customer.id}
                customerName={customer.name}
                customerPhone={customer.phone}
              />
            </Stack>

            <CollapsibleDetailSection title="고객 업무" testID="customer-detail-section-actions">
              <CustomerWorkspaceActionGrid
                actions={actions}
                onAction={(actionId) => void handleAction(actionId)}
              />
              {copyNotice ? (
                <AppText variant="caption" color="success">
                  {copyNotice}
                </AppText>
              ) : null}
            </CollapsibleDetailSection>

            <CollapsibleDetailSection title="기본 정보" testID="customer-detail-section-basic">
              <DetailRow label="주민번호" value={formatCustomerSsn(customer.ssn)} />
              <DetailRow label="성별" value={customerGenderLabel(customer.gender)} />
              <DetailRow
                label="보험나이"
                value={
                  customer.insuranceAge != null
                    ? `${customer.insuranceAge}세`
                    : formatCustomerDetailValue(null)
                }
              />
              <DetailRow label="상령일" value={formatCustomerDetailDate(customer.nextAgeDate)} />
              <DetailRow
                label="핸드폰번호"
                value={
                  customer.phone
                    ? formatCustomerPhone(customer.phone)
                    : formatCustomerDetailValue(null)
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
            </CollapsibleDetailSection>

            <CollapsibleDetailSection
              title="상담 및 후속관리"
              testID="customer-detail-section-consultation"
            >
              <DetailRow
                label="최근 상담일"
                value={formatCustomerDetailDate(
                  customer.lastConsultDate ?? customer.lastConsultationAt,
                )}
              />
              <DetailRow
                label="최근 상담"
                value={formatCustomerDetailValue(
                  customer.lastConsultationMemo ?? customer.lastConsultationSummary,
                )}
              />
              <DetailRow label="접촉 결과" value={formatCustomerDetailValue(customer.contactResult)} />
              <DetailRow
                label="다음 연락일"
                value={formatCustomerDetailDate(customer.nextContactDate)}
              />
              <DetailRow label="후속 상태" value={formatCustomerDetailValue(customer.followUpStatus)} />
              <DetailRow
                label="후속 메모"
                value={formatCustomerDetailValue(customer.followUpNotePreview)}
              />
            </CollapsibleDetailSection>

            <CollapsibleDetailSection title="차량 정보" testID="customer-detail-section-vehicle">
              {carsQuery.isLoading ? (
                <AppText variant="caption">차량 정보를 불러오는 중…</AppText>
              ) : carsQuery.data?.length ? (
                carsQuery.data.map((car, index) => (
                  <Stack key={car.id} gap="xs" style={styles.subBlock}>
                    <AppText variant="bodyStrong">
                      {car.isPrimary ? "대표 차량" : `차량 ${index + 1}`}
                    </AppText>
                    <DetailRow label="차량번호" value={formatCustomerDetailValue(car.carNumber)} />
                    <DetailRow
                      label="차종/모델"
                      value={formatCustomerDetailValue(car.carModel || car.carType)}
                    />
                    <DetailRow label="연식" value={formatCustomerDetailValue(car.carYear)} />
                    <DetailRow
                      label="갱신 예정일"
                      value={formatCustomerDetailDate(car.renewalDate)}
                    />
                  </Stack>
                ))
              ) : (
                <>
                  <DetailRow label="차량번호" value={formatCustomerDetailValue(customer.carNumber)} />
                  <DetailRow
                    label="차종"
                    value={formatCustomerDetailValue(customer.carModel || customer.carType)}
                  />
                  <DetailRow label="연식" value={formatCustomerDetailValue(customer.carYear)} />
                  <DetailRow
                    label="갱신 예정일"
                    value={formatCustomerDetailDate(customer.renewalDate)}
                  />
                </>
              )}
            </CollapsibleDetailSection>

            <CollapsibleDetailSection title="관계인" testID="customer-detail-section-relations">
              {relationsQuery.isLoading ? (
                <AppText variant="caption">관계인을 불러오는 중…</AppText>
              ) : relationsQuery.data?.length ? (
                relationsQuery.data.map((relation) => (
                  <DetailRow
                    key={relation.relatedCustomerId}
                    label={relation.relatedName}
                    value={relation.relatedPhone || "연락처 없음"}
                  />
                ))
              ) : (
                <AppText variant="caption" color="textSecondary">
                  연결된 관계인이 없습니다.
                </AppText>
              )}
            </CollapsibleDetailSection>

            <CollapsibleDetailSection title="기념일" testID="customer-detail-section-special-dates">
              {specialDatesQuery.isLoading ? (
                <AppText variant="caption">기념일을 불러오는 중…</AppText>
              ) : specialDatesQuery.data?.length ? (
                specialDatesQuery.data.map((item) => (
                  <DetailRow
                    key={item.id}
                    label={`${CUSTOMER_SPECIAL_DATE_PURPOSE_LABELS[item.purposeType]} · ${item.title}`}
                    value={formatCustomerDetailDate(item.dateValue)}
                  />
                ))
              ) : (
                <AppText variant="caption" color="textSecondary">
                  등록된 기념일이 없습니다.
                </AppText>
              )}
            </CollapsibleDetailSection>

            <CollapsibleDetailSection title="보험 및 참고사항" testID="customer-detail-section-insurance">
              <DetailRow label="병력" value={formatCustomerDetailValue(customer.medical)} />
              <DetailRow
                label="보험가입내역"
                value={formatCustomerDetailValue(customer.notes.insuranceHistory)}
              />
              <DetailRow
                label="계좌정보"
                value={formatCustomerDetailValue(customer.notes.accountNumber)}
              />
              <DetailRow
                label="수술·치료"
                value={formatCustomerDetailValue(customer.notes.treatmentHistoryNote)}
              />
              <DetailRow
                label="약 복용"
                value={formatCustomerDetailValue(customer.notes.medicationHistoryNote)}
              />
            </CollapsibleDetailSection>

            <CollapsibleDetailSection title="정보 관리" testID="customer-detail-section-management">
              <Inline>
                <Button
                  accessibilityLabel={`${customer.name} 고객 정보 수정`}
                  label="정보 수정"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/customers/[customerId]/edit",
                      params: { customerId: String(customer.id) },
                    })
                  }
                  style={styles.grow}
                />
                <Button
                  accessibilityLabel={`${customer.name} 고객 삭제`}
                  label="고객 삭제"
                  size="sm"
                  variant="danger"
                  onPress={() => setDeleteOpen(true)}
                  style={styles.grow}
                />
              </Inline>
              {deleteMutation.isError ? (
                <AppText variant="caption" color="danger">
                  {deleteMutation.error instanceof Error
                    ? deleteMutation.error.message
                    : "고객을 삭제하지 못했습니다."}
                </AppText>
              ) : null}
            </CollapsibleDetailSection>
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
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
      gap: theme.layout.compactListGap,
    },
    grow: { flex: 1 },
    customerName: { flexShrink: 1 },
    subBlock: {
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
  });
}
