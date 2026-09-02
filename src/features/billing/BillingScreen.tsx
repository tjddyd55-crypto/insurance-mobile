import { useEffect, useMemo, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../auth/AuthProvider";
import { AppHeader } from "../../components/AppHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { ErrorState } from "../../components/ErrorState";
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import {
  applyPromotion,
  billingCheckoutSummaryQueryKey,
  cancelSubscription,
  changeCycle,
  confirmBillingAuth,
  getCheckoutSummary,
  getManageSummary,
  getQuote,
  requestPayment,
  resumeSubscription,
} from "./billingApi";
import {
  billingMode,
  formatBillingDate,
  formatKrw,
  statusLabel,
} from "./billingModel";
import { hasActiveBillingEntitlement } from "./billingEntitlement";
import {
  formatBillingCycle,
  presentBillingStatus,
} from "./billingPresentation";
import { TossBillingAuthModal } from "./TossBillingAuthModal";
import type { BillingCycle } from "./types";

type Action =
  | { type: "pay" | "promotion" | "card" | "cancel" | "resume" }
  | { type: "cycle"; cycle: BillingCycle }
  | null;

export function BillingScreen() {
  const { token } = useAuth();
  const client = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [promo, setPromo] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authIntent, setAuthIntent] = useState<"register" | "charge">(
    "register",
  );
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const summary = useQuery({
    queryKey: billingCheckoutSummaryQueryKey,
    queryFn: () => getCheckoutSummary(token),
    enabled: Boolean(token),
  });
  const mode = billingMode(summary.data?.subscriptionStatus);
  const entitled = hasActiveBillingEntitlement(summary.data);
  const isTrial = mode === "trialing";
  const showManage = entitled && !isTrial;
  const planCode = summary.data?.plan?.code ?? "insurance_basic";
  useEffect(() => {
    if (summary.data?.billingCycle) setCycle(summary.data.billingCycle);
  }, [summary.data?.billingCycle]);
  const quote = useQuery({
    queryKey: ["billing", "quote", planCode, cycle, appliedPromo],
    queryFn: () => getQuote(token, planCode, cycle, appliedPromo),
    enabled: Boolean(token && summary.data && !entitled),
  });
  const manage = useQuery({
    queryKey: ["billing", "manage"],
    queryFn: () => getManageSummary(token),
    enabled: Boolean(token && showManage),
  });
  const subscription = manage.data?.subscription;
  const billingStatus = summary.data
    ? presentBillingStatus(summary.data, subscription)
    : null;
  const refresh = async () => {
    await Promise.all([
      summary.refetch(),
      showManage ? manage.refetch() : Promise.resolve(),
    ]);
  };
  const execute = useMutation({
    mutationFn: async (target: NonNullable<Action>) => {
      if (target.type === "promotion")
        return applyPromotion(token, appliedPromo!, planCode, cycle);
      if (target.type === "pay")
        return requestPayment(token, planCode, cycle, appliedPromo);
      if (target.type === "cycle") return changeCycle(token, target.cycle);
      if (target.type === "cancel") return cancelSubscription(token);
      if (target.type === "resume") return resumeSubscription(token);
      return undefined;
    },
    onSuccess: async (_, target) => {
      setAction(null);
      if (target.type === "card") return;
      setNotice(
        target.type === "pay"
          ? "결제 요청이 완료되었습니다."
          : target.type === "promotion"
            ? "이용권이 적용되었습니다."
            : target.type === "cancel"
              ? "자동결제 해지가 예약되었습니다."
              : target.type === "resume"
                ? "자동결제가 다시 시작되었습니다."
                : "요금제 변경이 예약되었습니다.",
      );
      await client.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (cause) =>
      setError(
        cause instanceof Error ? cause.message : "요청을 처리하지 못했습니다.",
      ),
  });
  const applyCoupon = useMutation({
    mutationFn: () =>
      getQuote(token, planCode, cycle, promo.trim().toUpperCase()),
    onSuccess: (result) => {
      if (result.quote.valid && result.quote.coupon) {
        setAppliedPromo(result.quote.coupon.code);
        setNotice(result.quote.coupon.message || "쿠폰이 적용되었습니다.");
      } else setError(result.quote.message || "사용할 수 없는 쿠폰입니다.");
    },
    onError: (cause) =>
      setError(
        cause instanceof Error ? cause.message : "쿠폰을 확인하지 못했습니다.",
      ),
  });
  async function handleAuth(authKey: string, customerKey: string) {
    try {
      await confirmBillingAuth(token, authKey, customerKey);
      setAuthOpen(false);
      setNotice("결제수단을 안전하게 등록했습니다.");
      if (authIntent === "charge") {
        await requestPayment(token, planCode, cycle, appliedPromo);
        setNotice("결제수단 등록과 결제 요청이 완료되었습니다.");
      }
      await client.invalidateQueries({ queryKey: ["billing"] });
    } catch (cause) {
      setAuthOpen(false);
      setError(
        cause instanceof Error
          ? cause.message
          : "결제수단을 등록하지 못했습니다.",
      );
    }
  }
  function beginCard(intent: "register" | "charge") {
    setAuthIntent(intent);
    setAuthOpen(true);
    setAction(null);
  }
  function primaryAction() {
    const q = quote.data?.quote;
    if (q?.benefitKind === "free_months" && appliedPromo)
      setAction({ type: "promotion" });
    else if (!summary.data?.checkoutConfig?.hasBillingKey)
      setAction({ type: "card" });
    else setAction({ type: "pay" });
  }
  const config = summary.data?.checkoutConfig;
  const q = quote.data?.quote;
  const confirmMessage =
    action?.type === "pay"
      ? `${formatKrw(q?.todayChargeAmount)}을 등록된 결제수단으로 결제하시겠습니까?`
      : action?.type === "promotion"
        ? `${appliedPromo} 이용권을 적용하시겠습니까? 구독 상태가 즉시 변경됩니다.`
        : action?.type === "card"
          ? "토스페이먼츠 보안 화면에서 결제수단을 등록한 뒤 결제를 계속하시겠습니까?"
          : action?.type === "cycle"
            ? `${action.cycle === "yearly" ? "연간" : "월간"} 요금제로 다음 결제일부터 변경하시겠습니까?`
            : action?.type === "cancel"
              ? `자동결제를 해지하시겠습니까? 현재 이용기간 ${formatBillingDate(subscription?.currentPeriodEnd)}까지는 이용할 수 있습니다.`
              : "자동결제를 다시 시작하시겠습니까? 오늘 추가 결제는 없습니다.";
  return (
    <View style={styles.root}>
      <AppHeader title="구독 및 결제" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={summary.isRefetching || manage.isRefetching}
              onRefresh={() => void refresh()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          {notice ? (
            <Card variant="filled">
              <AppText color="success">{notice}</AppText>
            </Card>
          ) : null}
          {error ? (
            <Card variant="outlined">
              <AppText color="danger">{error}</AppText>
            </Card>
          ) : null}
          {summary.isError ? (
            <ErrorState
              title="구독 정보를 불러오지 못했습니다"
              message={
                summary.error instanceof Error
                  ? summary.error.message
                  : "잠시 후 다시 시도해 주세요."
              }
              onRetry={() => void summary.refetch()}
            />
          ) : null}
          {summary.data ? (
            <>
              <Card>
                <Stack gap="md">
                  <Inline justify="space-between">
                    <View style={styles.grow}>
                      <AppText variant="heading">
                        {summary.data.plan?.name ||
                          summary.data.planName ||
                          "ONE FC 요금제"}
                      </AppText>
                      <AppText variant="caption">
                        구독 상태와 결제수단은 서버에서 안전하게 관리됩니다.
                      </AppText>
                    </View>
                    <Badge
                      label={billingStatus?.label ?? "이용 상태 확인 필요"}
                      tone={billingStatus?.tone ?? "default"}
                    />
                  </Inline>
                  {summary.data.trialEndsAt ? (
                    <PriceRow
                      label="무료 이용 종료일"
                      value={formatBillingDate(summary.data.trialEndsAt)}
                    />
                  ) : null}
                  {summary.data.nextBillingAt && !isTrial ? (
                    <PriceRow
                      label="다음 자동결제"
                      value={formatBillingDate(summary.data.nextBillingAt)}
                    />
                  ) : null}
                </Stack>
              </Card>
              {isTrial && entitled ? (
                <Card variant="outlined">
                  <Stack gap="sm">
                    <AppText variant="sectionTitle">무료 이용 안내</AppText>
                    <AppText color="textSecondary">
                      무료 이용 종료일까지 ONE FC CRM 기능을 정상적으로 이용할 수
                      있습니다.
                    </AppText>
                    <AppText variant="caption">
                      결제수단을 등록하지 않아도 무료 이용 기간에는 이용이 제한되지
                      않습니다.
                    </AppText>
                  </Stack>
                </Card>
              ) : showManage ? (
                <ManagePanel
                  data={manage.data}
                  config={config}
                  busy={execute.isPending}
                  onRegister={() => beginCard("register")}
                  onCycle={(next) => setAction({ type: "cycle", cycle: next })}
                  onCancel={() => setAction({ type: "cancel" })}
                  onResume={() => setAction({ type: "resume" })}
                />
              ) : (
                <>
                  <Card variant="outlined">
                    <Stack gap="md">
                      <AppText variant="heading">① 요금제 선택</AppText>
                      <Inline>
                        <Button
                          label={`월간 ${formatKrw(summary.data.plan?.monthlyTotal ?? 8800)}`}
                          style={styles.grow}
                          variant={
                            cycle === "monthly" ? "selected" : "secondary"
                          }
                          onPress={() => setCycle("monthly")}
                        />
                        <Button
                          label={`연간 ${formatKrw(summary.data.plan?.yearlyTotal ?? 88000)}`}
                          style={styles.grow}
                          variant={cycle === "yearly" ? "selected" : "secondary"}
                          onPress={() => setCycle("yearly")}
                        />
                      </Inline>
                    </Stack>
                  </Card>
                  <Card variant="outlined">
                    <Stack gap="md">
                      <AppText variant="heading">② 쿠폰 및 할인</AppText>
                      {appliedPromo ? (
                        <Stack gap="sm">
                          <Inline justify="space-between">
                            <View style={styles.grow}>
                              <AppText variant="bodyStrong">
                                {appliedPromo} 적용됨
                              </AppText>
                              {q?.coupon?.freeMonths ? (
                                <AppText variant="caption">
                                  무료 이용 {q.coupon.freeMonths}개월
                                </AppText>
                              ) : null}
                            </View>
                            <Button
                              label="취소"
                              size="sm"
                              variant="ghost"
                              onPress={() => {
                                setAppliedPromo(null);
                                setPromo("");
                              }}
                            />
                          </Inline>
                          {q?.coupon?.message ? (
                            <AppText variant="caption" color="success">
                              {q.coupon.message}
                            </AppText>
                          ) : null}
                        </Stack>
                      ) : (
                        <Inline align="flex-end">
                          <TextField
                            label="쿠폰 코드"
                            value={promo}
                            onChangeText={(value) =>
                              setPromo(value.toUpperCase())
                            }
                            autoCapitalize="characters"
                            containerStyle={styles.grow}
                          />
                          <Button
                            label="확인"
                            loading={applyCoupon.isPending}
                            disabled={!promo.trim()}
                            onPress={() => applyCoupon.mutate()}
                          />
                        </Inline>
                      )}
                    </Stack>
                  </Card>
                  <Card variant="outlined">
                    <Stack gap="md">
                      <AppText variant="heading">③ 결제수단</AppText>
                      <AppText>
                        {config?.hasBillingKey
                          ? [config.cardCompany, config.cardNumberMasked]
                              .filter(Boolean)
                              .join(" ") || "등록됨"
                          : "등록된 결제수단이 없습니다."}
                      </AppText>
                      {config?.provider === "toss" && config.enabled ? (
                        <Button
                          label={
                            config.hasBillingKey ? "결제수단 변경" : "카드 등록"
                          }
                          variant="secondary"
                          onPress={() => beginCard("register")}
                        />
                      ) : (
                        <AppText variant="caption">
                          현재 결제수단 등록을 사용할 수 없습니다.
                        </AppText>
                      )}
                    </Stack>
                  </Card>
                  <Card>
                    <Stack gap="md">
                      <AppText variant="heading">④ 결제금액</AppText>
                      <PriceRow
                        label={
                          cycle === "yearly" ? "연간 이용권" : "월간 이용권"
                        }
                        value={formatKrw(q?.baseAmount)}
                      />
                      <PriceRow
                        label="쿠폰 할인"
                        value={`-${formatKrw(q?.discountAmount)}`}
                      />
                      <Divider />
                      <PriceRow
                        label="오늘 결제금액"
                        value={formatKrw(q?.todayChargeAmount)}
                        strong
                      />
                      <AppText variant="caption">
                        다음 자동결제 {formatBillingDate(q?.nextBillingAt)} ·{" "}
                        {formatKrw(q?.nextChargeAmount)}
                      </AppText>
                      <Button
                        label={
                          q?.todayChargeAmount === 0
                            ? "무료 이용 시작"
                            : `${formatKrw(q?.todayChargeAmount)} 결제하기`
                        }
                        fullWidth
                        disabled={!q?.valid || !config?.enabled}
                        loading={execute.isPending}
                        onPress={primaryAction}
                      />
                    </Stack>
                  </Card>
                </>
              )}
            </>
          ) : null}
        </ScrollView>
      </Screen>
      <ConfirmDialog
        open={Boolean(action)}
        title="구독 변경 확인"
        message={confirmMessage}
        confirmLabel={action?.type === "cancel" ? "해지 예약" : "계속"}
        tone={action?.type === "cancel" ? "danger" : "default"}
        busy={execute.isPending}
        onCancel={() => setAction(null)}
        onConfirm={() =>
          action?.type === "card"
            ? beginCard("charge")
            : action
              ? execute.mutateAsync(action)
              : undefined
        }
      />
      <TossBillingAuthModal
        open={authOpen}
        config={config}
        onClose={() => setAuthOpen(false)}
        onSuccess={(authKey, customerKey) =>
          void handleAuth(authKey, customerKey)
        }
        onError={(message) => {
          setAuthOpen(false);
          setError(message);
        }}
      />
    </View>
  );
}

function PriceRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <Inline justify="space-between">
      <AppText variant={strong ? "bodyStrong" : "body"}>{label}</AppText>
      <AppText variant={strong ? "bodyStrong" : "body"}>{value}</AppText>
    </Inline>
  );
}
function ManagePanel({
  data,
  config,
  busy,
  onRegister,
  onCycle,
  onCancel,
  onResume,
}: {
  data: Awaited<ReturnType<typeof getManageSummary>> | undefined;
  config: Awaited<ReturnType<typeof getCheckoutSummary>>["checkoutConfig"];
  busy: boolean;
  onRegister: () => void;
  onCycle: (cycle: BillingCycle) => void;
  onCancel: () => void;
  onResume: () => void;
}) {
  const sub = data?.subscription;
  const isCancelScheduled = sub?.autoRenewStatus === "CANCEL_SCHEDULED";
  return (
    <>
      <Card variant="outlined">
        <Stack gap="md">
          <Inline justify="space-between">
            <AppText variant="heading">구독 관리</AppText>
            {isCancelScheduled ? (
              <Badge label="해지 예정" tone="warning" />
            ) : (
              <Badge label="유료 이용 중" tone="success" />
            )}
          </Inline>
          {isCancelScheduled ? (
            <Card variant="filled" padding="sm">
              <AppText color="textSecondary">
                이용 종료일까지 현재 요금제와 CRM 기능을 계속 사용할 수 있습니다.
              </AppText>
            </Card>
          ) : null}
          <PriceRow
            label="현재 요금제"
            value={`${sub?.planName ?? "ONE FC"} · ${formatBillingCycle(sub?.billingCycle)}`}
          />
          <PriceRow
            label={isCancelScheduled ? "이용 종료일" : "현재 이용 종료일"}
            value={formatBillingDate(sub?.currentPeriodEnd)}
          />
          {!isCancelScheduled ? (
            <PriceRow
              label="다음 자동결제"
              value={`${formatBillingDate(sub?.nextBillingAt)} · ${formatKrw(sub?.nextChargeAmount)}`}
            />
          ) : null}
          <PriceRow
            label="결제수단"
            value={
              config?.hasBillingKey
                ? [config.cardCompany, config.cardNumberMasked]
                    .filter(Boolean)
                    .join(" ") || "등록됨"
                : "미등록"
            }
          />
          <Inline wrap>
            <Button
              label="월간 변경"
              size="sm"
              variant="secondary"
              disabled={busy || sub?.billingCycle === "monthly"}
              onPress={() => onCycle("monthly")}
            />
            <Button
              label="연간 변경"
              size="sm"
              variant="secondary"
              disabled={busy || sub?.billingCycle === "yearly"}
              onPress={() => onCycle("yearly")}
            />
            <Button
              label="결제수단 변경"
              size="sm"
              variant="secondary"
              onPress={onRegister}
            />
            {isCancelScheduled ? (
              <Button label="다시 시작" size="sm" onPress={onResume} />
            ) : (
              <Button
                label="자동결제 해지"
                size="sm"
                variant="danger"
                onPress={onCancel}
              />
            )}
          </Inline>
        </Stack>
      </Card>
      {data?.payments.length ? (
        <>
          <AppText variant="heading">결제 내역</AppText>
          {data.payments.map((payment) => (
            <Card key={payment.id} variant="outlined">
              <Inline justify="space-between">
                <View>
                  <AppText variant="bodyStrong">{payment.planName}</AppText>
                  <AppText variant="caption">
                    {formatBillingDate(payment.paidAt ?? payment.createdAt)} ·{" "}
                    {statusLabel(payment.status)}
                  </AppText>
                </View>
                <AppText variant="bodyStrong">
                  {formatKrw(payment.totalAmount)}
                </AppText>
              </Inline>
            </Card>
          ))}
        </>
      ) : null}
    </>
  );
}
function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    grow: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.huge,
      gap: theme.spacing.md,
    },
  });
}
