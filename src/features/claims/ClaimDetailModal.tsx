import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { EmptyState } from "../../components/EmptyState";
import { ErrorState } from "../../components/ErrorState";
import { LoadingState } from "../../components/LoadingState";
import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  ModalShell,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { CLAIM_DETAIL_SECTION_TITLES } from "./claimsDetailLayout";
import {
  CLAIM_STATUSES,
  claimFileTypeLabel,
  claimMessage,
  claimStatusMeta,
  extractClaimFileUrl,
  formatClaimDate,
  formatClaimFileSize,
  formatClaimRequester,
} from "./claimsModel";
import type { ClaimDetail, ClaimFile, ClaimStatus } from "./types";

type ClaimDetailModalProps = {
  open: boolean;
  detail?: ClaimDetail;
  loading: boolean;
  nextStatus: ClaimStatus;
  memo: string;
  saving: boolean;
  error: Error | null;
  loadError: Error | null;
  onClose: () => void;
  onRetryLoad: () => void;
  onStatusChange: (value: ClaimStatus) => void;
  onMemoChange: (value: string) => void;
  onSave: () => void;
  onOpenFile: (file: ClaimFile, download: boolean) => void;
  onShareFile: (file: ClaimFile) => void;
  sharingFileId: number | null;
  bundleKind: "pdf" | "zip" | null;
  onShareBundle: (kind: "pdf" | "zip") => void;
  onOpenCustomer: (customerId: number) => void;
  actionError: string;
  statusNotice: string;
};

export function ClaimDetailModal({
  open,
  detail,
  loading,
  nextStatus,
  memo,
  saving,
  error,
  loadError,
  onClose,
  onRetryLoad,
  onStatusChange,
  onMemoChange,
  onSave,
  onOpenFile,
  onShareFile,
  sharingFileId,
  bundleKind,
  onShareBundle,
  onOpenCustomer,
  actionError,
  statusNotice,
}: ClaimDetailModalProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const status = detail ? claimStatusMeta(detail.status) : null;
  const saveDisabled =
    !detail || (nextStatus === detail.status && !memo.trim());
  const [
    infoSectionTitle,
    contentSectionTitle,
    statusSectionTitle,
  ] = CLAIM_DETAIL_SECTION_TITLES;

  return (
    <ModalShell
      open={open}
      title="청구 상세"
      subtitle={detail ? `청구번호 #${detail.id}` : undefined}
      busy={saving}
      dialogBodyPadding={theme.spacing.md}
      onRequestClose={onClose}
      headerAction={
        <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
      }
    >
      {loadError ? (
        <ErrorState
          title="청구 상세를 불러오지 못했습니다"
          message={loadError.message}
          onRetry={onRetryLoad}
        />
      ) : loading || !detail ? (
        <LoadingState compact message="청구 상세를 불러오는 중…" />
      ) : (
        <Stack gap="md" style={styles.sections}>
          <DetailSection title={infoSectionTitle}>
            <Card variant="outlined" padding="md" style={styles.fullWidth}>
              <Stack gap="sm">
                <Inline justify="space-between" align="flex-start">
                  <Stack gap="xs" style={styles.grow}>
                    <DetailRow label="청구번호" value={`#${detail.id}`} />
                    <DetailRow
                      label="접수일시"
                      value={formatClaimDate(detail.submittedAt)}
                    />
                    <DetailRow
                      label="요청자"
                      value={
                        formatClaimRequester(
                          detail.requesterName,
                          detail.requesterBirthDate,
                          detail.requesterPhone,
                        ) || "—"
                      }
                    />
                  </Stack>
                  {status ? (
                    <Badge label={status.label} tone={status.tone} />
                  ) : null}
                </Inline>
                <Button
                  label="고객 상세 보기"
                  size="sm"
                  variant="secondary"
                  onPress={() => onOpenCustomer(detail.customerId)}
                />
              </Stack>
            </Card>
          </DetailSection>

          <DetailSection title={contentSectionTitle}>
            <Card variant="outlined" padding="md" style={styles.fullWidth}>
              <Stack gap="md">
                <AppText>{claimMessage(detail.title, detail.memo)}</AppText>
                <View style={styles.divider} />
                <Stack gap="sm">
                  <Inline justify="space-between" align="center">
                    <AppText variant="label">
                      첨부 파일 {detail.files.length}개
                    </AppText>
                  </Inline>
                  {actionError ? (
                    <AppText color="danger">{actionError}</AppText>
                  ) : null}
                  {detail.files.length ? (
                    <>
                      <Inline wrap>
                        <Button
                          label="PDF 다운로드"
                          size="sm"
                          variant="secondary"
                          loading={bundleKind === "pdf"}
                          disabled={bundleKind != null}
                          onPress={() => onShareBundle("pdf")}
                        />
                        <Button
                          label="전체 다운로드"
                          size="sm"
                          variant="secondary"
                          loading={bundleKind === "zip"}
                          disabled={bundleKind != null}
                          onPress={() => onShareBundle("zip")}
                        />
                      </Inline>
                      {detail.files.map((file) => (
                        <AttachmentRow
                          key={file.id}
                          file={file}
                          sharing={sharingFileId === file.id}
                          onOpen={onOpenFile}
                          onShare={onShareFile}
                        />
                      ))}
                    </>
                  ) : (
                    <EmptyState title="첨부 파일이 없습니다" compact />
                  )}
                </Stack>
              </Stack>
            </Card>
          </DetailSection>

          <DetailSection title={statusSectionTitle}>
            <Card variant="outlined" padding="md" style={styles.fullWidth}>
              <Stack gap="md">
                <Inline wrap>
                  {CLAIM_STATUSES.map((item) => (
                    <Button
                      key={item.value}
                      label={item.label}
                      size="sm"
                      variant={
                        nextStatus === item.value ? "selected" : "secondary"
                      }
                      onPress={() => onStatusChange(item.value)}
                    />
                  ))}
                </Inline>
                <TextField
                  label="내부 처리 메모"
                  placeholder="상태 이력에 남길 메모를 입력해 주세요."
                  value={memo}
                  onChangeText={onMemoChange}
                  multiline
                  numberOfLines={4}
                  maxLength={255}
                />
                {error ? (
                  <AppText color="danger">{error.message}</AppText>
                ) : null}
                {statusNotice ? (
                  <AppText color="success">{statusNotice}</AppText>
                ) : null}
                <Button
                  label="상태 저장"
                  fullWidth
                  loading={saving}
                  disabled={saveDisabled}
                  onPress={onSave}
                />
                {detail.statusLogs.length ? (
                  <Stack gap="sm">
                    <AppText variant="label">상태 이력</AppText>
                    {detail.statusLogs.map((log) => (
                      <Card key={log.id} variant="filled" padding="sm">
                        <Stack gap="xs">
                          <AppText variant="bodyStrong">
                            {log.fromStatus
                              ? `${claimStatusMeta(log.fromStatus).label} → `
                              : ""}
                            {claimStatusMeta(log.toStatus).label}
                          </AppText>
                          <AppText variant="caption">
                            {formatClaimDate(log.changedAt)}
                          </AppText>
                          {log.memo ? (
                            <AppText color="textSecondary">{log.memo}</AppText>
                          ) : null}
                        </Stack>
                      </Card>
                    ))}
                  </Stack>
                ) : null}
              </Stack>
            </Card>
          </DetailSection>
        </Stack>
      )}
    </ModalShell>
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <Stack gap="xs">
      <AppText variant="sectionTitle">{title}</AppText>
      {children}
    </Stack>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline justify="space-between" align="flex-start" style={{ gap: 12 }}>
      <AppText variant="label" color="textSecondary">
        {label}
      </AppText>
      <AppText style={{ flex: 1 }} align="right">
        {value}
      </AppText>
    </Inline>
  );
}

function AttachmentRow({
  file,
  sharing,
  onOpen,
  onShare,
}: {
  file: ClaimFile;
  sharing: boolean;
  onOpen: (file: ClaimFile, download: boolean) => void;
  onShare: (file: ClaimFile) => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createAttachmentStyles(theme), [theme]);

  return (
    <View style={styles.row}>
      <View style={styles.meta}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {file.fileName}
        </AppText>
        <AppText variant="caption" numberOfLines={1}>
          {claimFileTypeLabel(file.contentType)} ·{" "}
          {formatClaimFileSize(file.fileSize)}
        </AppText>
      </View>
      <Inline wrap style={styles.actions}>
        <Button
          label="열기"
          size="sm"
          variant="secondary"
          onPress={() => onOpen(file, false)}
        />
        <Button
          label="다운로드"
          size="sm"
          variant="secondary"
          disabled={!extractClaimFileUrl(file, true)}
          onPress={() => onOpen(file, true)}
        />
        <Button
          label="공유"
          size="sm"
          variant="ghost"
          loading={sharing}
          onPress={() => onShare(file)}
        />
      </Inline>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    sections: {
      width: "100%",
    },
    fullWidth: {
      width: "100%",
      alignSelf: "stretch",
    },
    grow: {
      flex: 1,
      minWidth: 0,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
    },
  });
}

function createAttachmentStyles(theme: AppTheme) {
  return StyleSheet.create({
    row: {
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
    },
    meta: {
      flex: 1,
      minWidth: 0,
      gap: theme.spacing.xxs,
    },
    actions: {
      justifyContent: "flex-end",
    },
  });
}
