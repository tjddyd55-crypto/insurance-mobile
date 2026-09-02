import { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  View,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useAuth } from "../../auth/AuthProvider";
import { resolveApiUrl } from "../../api/client";
import { AppHeader } from "../../components/AppHeader";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { EmptyState } from "../../components/EmptyState";
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
import { listCustomers } from "../customers/customersApi";
import { formatCustomerPhone } from "../customers/customerModel";
import { useCustomerDetailBack } from "../customers/customerWorkspaceNavigation";
import { shareRemoteFile } from "../files/remoteFileSharing";
import {
  createCustomerAppLink,
  getClaimBundleDownloadUrl,
  getClaim,
  getCustomerAppLink,
  listClaims,
  sendCustomerAppAlimtalk,
  updateClaimStatus,
} from "./claimsApi";
import { CLAIM_STATUSES, extractClaimFileUrl } from "./claimsModel";
import type { ClaimDetail, ClaimStatus } from "./types";
import { ClaimCustomerPickerModal } from "./ClaimCustomerPickerModal";
import { ClaimDetailModal } from "./ClaimDetailModal";
import { ClaimListCard } from "./ClaimListCard";
import { CustomerClaimConnectionCard } from "./CustomerClaimConnectionCard";

export function ClaimsScreen({
  initialCustomerId = null,
  initialClaimId = null,
}: {
  initialCustomerId?: number | null;
  initialClaimId?: number | null;
}) {
  const { token } = useAuth();
  const router = useRouter();
  const onCustomerBack = useCustomerDetailBack(initialCustomerId ?? 0);
  const client = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [customerId, setCustomerId] = useState<number | null>(
    initialCustomerId,
  );
  const [status, setStatus] = useState<ClaimStatus | "">("");
  const [picker, setPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(initialClaimId);
  const [nextStatus, setNextStatus] = useState<ClaimStatus>("processing");
  const [statusMemo, setStatusMemo] = useState("");
  const [sendConfirm, setSendConfirm] = useState(false);
  const [notice, setNotice] = useState("");
  const [sharingFileId, setSharingFileId] = useState<number | null>(null);
  const [bundleKind, setBundleKind] = useState<"pdf" | "zip" | null>(null);
  const [detailActionError, setDetailActionError] = useState("");
  const customers = useQuery({
    queryKey: ["customers", "claims-picker"],
    queryFn: () => listCustomers(token, 1000),
    enabled: Boolean(token),
  });
  const customer = customers.data?.customers.find(
    (row) => row.id === customerId,
  );
  useEffect(() => {
    setCustomerId(initialCustomerId);
    setSelectedId(initialClaimId);
  }, [initialClaimId, initialCustomerId]);
  const listKey = ["claims", customerId, status] as const;
  const claims = useQuery({
    queryKey: listKey,
    queryFn: () => listClaims(token, { customerId, status }),
    enabled: Boolean(token),
  });
  const detail = useQuery({
    queryKey: ["claim", selectedId],
    queryFn: () => getClaim(token, selectedId!),
    enabled: Boolean(token && selectedId),
  });
  const link = useQuery({
    queryKey: ["customer-app-link", customerId],
    queryFn: () => getCustomerAppLink(token, customerId!),
    enabled: Boolean(token && customerId),
  });
  useEffect(() => {
    if (detail.data) {
      setNextStatus(detail.data.status);
      setStatusMemo("");
    }
  }, [detail.data]);
  const statusMutation = useMutation({
    mutationFn: () =>
      updateClaimStatus(token, selectedId!, nextStatus, statusMemo.trim()),
    onSuccess: async () => {
      setNotice("청구 상태를 저장했습니다.");
      await Promise.all([
        client.invalidateQueries({ queryKey: listKey }),
        client.invalidateQueries({ queryKey: ["claim", selectedId] }),
      ]);
    },
  });
  const createLink = useMutation({
    mutationFn: () => createCustomerAppLink(token, customerId!),
    onSuccess: async () => {
      setNotice("고객 앱 연결 링크를 준비했습니다.");
      await client.invalidateQueries({
        queryKey: ["customer-app-link", customerId],
      });
    },
  });
  const sendLink = useMutation({
    mutationFn: () => sendCustomerAppAlimtalk(token, customerId!),
    onSuccess: (result) => {
      setSendConfirm(false);
      setNotice(
        result.status === "sent"
          ? `${result.receiverMasked ?? "고객"}에게 연결 알림톡을 발송했습니다.`
          : `발송 결과: ${result.status}`,
      );
    },
  });
  const linkValue = link.data?.universalUrl || link.data?.connectUrl || "";
  const code = link.data?.agentCode || link.data?.linkCode || "";
  async function shareLink() {
    if (!linkValue) return;
    await Share.share({
      title: "ONE FC 고객 보험청구 연결",
      message: linkValue,
      url: linkValue,
    });
  }
  async function openFile(
    file: ClaimDetail["files"][number],
    download = false,
  ) {
    setDetailActionError("");
    const raw = extractClaimFileUrl(file, download);
    if (!raw) {
      setDetailActionError("파일 URL을 확인할 수 없습니다.");
      return;
    }
    try {
      await Linking.openURL(resolveApiUrl(raw));
    } catch (error) {
      setDetailActionError(
        error instanceof Error ? error.message : "파일을 열지 못했습니다.",
      );
    }
  }
  async function shareFile(file: ClaimDetail["files"][number]) {
    setDetailActionError("");
    const raw = extractClaimFileUrl(file, true);
    if (!raw) {
      setDetailActionError("공유할 파일 URL을 확인할 수 없습니다.");
      return;
    }
    setSharingFileId(file.id);
    try {
      await shareRemoteFile({
        url: resolveApiUrl(raw),
        fileName: file.fileName,
        mimeType: file.contentType,
      });
    } catch (error) {
      setDetailActionError(
        error instanceof Error ? error.message : "파일을 공유하지 못했습니다.",
      );
    } finally {
      setSharingFileId(null);
    }
  }
  async function shareBundle(kind: "pdf" | "zip") {
    if (!detail.data) return;
    setDetailActionError("");
    setBundleKind(kind);
    try {
      const raw = await getClaimBundleDownloadUrl(
        token,
        detail.data.id,
        detail.data.customerId,
        kind,
      );
      await shareRemoteFile({
        url: resolveApiUrl(raw),
        fileName: `${detail.data.customerName || "고객"}-보험청구-${detail.data.id}.${kind}`,
        mimeType: kind === "pdf" ? "application/pdf" : "application/zip",
      });
    } catch (error) {
      setDetailActionError(
        error instanceof Error
          ? error.message
          : "첨부파일 묶음을 내려받지 못했습니다.",
      );
    } finally {
      setBundleKind(null);
    }
  }
  return (
    <View style={styles.root}>
      <AppHeader
        title="청구관리"
        showMenu={!initialCustomerId}
        showBack={Boolean(initialCustomerId)}
        onBackPress={initialCustomerId ? onCustomerBack : undefined}
      />
      <Screen padded={false}>
        <FlatList
          data={claims.data?.rows ?? []}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.content}
          refreshing={claims.isRefetching}
          onRefresh={() => void claims.refetch()}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Stack gap="md" style={styles.listHeader}>
              <Inline justify="space-between">
                <View style={styles.grow}>
                  <AppText variant="heading">고객 보험청구</AppText>
                  <AppText variant="caption">
                    고객 앱으로 접수된 청구와 첨부서류를 처리합니다.
                  </AppText>
                </View>
                {initialCustomerId ? (
                  <Button
                    label="고객 보기"
                    size="sm"
                    variant="ghost"
                    onPress={() =>
                      router.push(`/customers/${initialCustomerId}`)
                    }
                  />
                ) : null}
              </Inline>
              <Button
                label={
                  customer
                    ? `${customer.name} · ${formatCustomerPhone(customer.phone)}`
                    : "전체 고객"
                }
                variant="secondary"
                fullWidth
                disabled={Boolean(initialCustomerId)}
                onPress={() => setPicker(true)}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filters}
              >
                <Button
                  label="전체"
                  size="sm"
                  variant={!status ? "selected" : "secondary"}
                  onPress={() => setStatus("")}
                />
                {CLAIM_STATUSES.map((item) => (
                  <Button
                    key={item.value}
                    label={item.label}
                    size="sm"
                    variant={status === item.value ? "selected" : "secondary"}
                    onPress={() => setStatus(item.value)}
                  />
                ))}
              </ScrollView>
              {notice ? (
                <Card variant="filled">
                  <AppText color="success">{notice}</AppText>
                </Card>
              ) : null}
              {customerId ? (
                <CustomerClaimConnectionCard
                  customerName={customer?.name ?? "선택 고객"}
                  linkValue={linkValue}
                  code={code}
                  loading={link.isLoading}
                  creating={createLink.isPending}
                  onCreate={() => createLink.mutate()}
                  onCopy={async (value, label) => {
                    await Clipboard.setStringAsync(value);
                    setNotice(`${label}를 복사했습니다.`);
                  }}
                  onShare={() => void shareLink()}
                  onSend={() => setSendConfirm(true)}
                />
              ) : null}
              {claims.isError ? (
                <ErrorState
                  title="청구 요청을 불러오지 못했습니다"
                  message={
                    claims.error instanceof Error
                      ? claims.error.message
                      : "잠시 후 다시 시도해 주세요."
                  }
                  onRetry={() => void claims.refetch()}
                />
              ) : null}
              <Inline wrap>
                <Badge label={`총 ${claims.data?.total ?? 0}건`} tone="info" />
                {customer ? (
                  <Badge label={customer.name} tone="success" />
                ) : null}
              </Inline>
            </Stack>
          }
          ListEmptyComponent={
            claims.isLoading ? (
              <LoadingState compact message="청구 요청을 불러오는 중…" />
            ) : !claims.isError ? (
              <EmptyState
                compact
                title={
                  status
                    ? `${CLAIM_STATUSES.find((item) => item.value === status)?.label} 청구가 없습니다`
                    : "청구 요청이 없습니다"
                }
                message={status ? "다른 상태 필터를 선택해 보세요." : undefined}
              />
            ) : null
          }
          renderItem={({ item }) => (
            <ClaimListCard
              claim={item}
              onPress={() => {
                setNotice("");
                setDetailActionError("");
                setSelectedId(item.id);
              }}
            />
          )}
        />
      </Screen>
      <ClaimCustomerPickerModal
        open={picker}
        customers={customers.data?.customers ?? []}
        search={search}
        fixed={Boolean(initialCustomerId)}
        onSearchChange={setSearch}
        onClose={() => setPicker(false)}
        onSelect={(id) => {
          setCustomerId(id);
          setPicker(false);
        }}
      />
      <ClaimDetailModal
        open={Boolean(selectedId)}
        detail={detail.data}
        loading={detail.isLoading}
        nextStatus={nextStatus}
        memo={statusMemo}
        saving={statusMutation.isPending}
        error={statusMutation.error}
        loadError={detail.error}
        onClose={() => {
          setSelectedId(null);
          setDetailActionError("");
        }}
        onRetryLoad={() => void detail.refetch()}
        onStatusChange={setNextStatus}
        onMemoChange={setStatusMemo}
        onSave={() => statusMutation.mutate()}
        onOpenFile={(file, download) => void openFile(file, download)}
        onShareFile={(file) => void shareFile(file)}
        sharingFileId={sharingFileId}
        bundleKind={bundleKind}
        onShareBundle={(kind) => void shareBundle(kind)}
        onOpenCustomer={(id) => {
          setSelectedId(null);
          router.push(`/customers/${id}`);
        }}
        actionError={detailActionError}
        statusNotice={notice}
      />
      <ConfirmDialog
        open={sendConfirm}
        title="고객 앱 링크 발송"
        message={`${customer?.name ?? "선택 고객"}에게 보험청구 연결 알림톡을 발송하시겠습니까? 실제 외부 메시지가 발송됩니다.`}
        confirmLabel="발송"
        busy={sendLink.isPending}
        onCancel={() => setSendConfirm(false)}
        onConfirm={() => sendLink.mutateAsync()}
      />
    </View>
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
    listHeader: { paddingBottom: theme.spacing.md },
    filters: { gap: theme.spacing.sm },
    separator: { height: theme.spacing.sm },
  });
}
