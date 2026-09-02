import type { ReactNode } from "react";
import { View } from "react-native";

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
} from "../../design-system";
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
  const status = detail ? claimStatusMeta(detail.status) : null;
  const saveDisabled =
    !detail || (nextStatus === detail.status && !memo.trim());

  return (
    <ModalShell
      open={open}
      title="청구 상세"
      subtitle={detail ? `청구번호 #${detail.id}` : undefined}
      busy={saving}
      onRequestClose={onClose}
      headerAction={
        <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
      }
      footer={
        detail ? (
          <Button
            label="상태 저장"
            fullWidth
            loading={saving}
            disabled={saveDisabled}
            onPress={onSave}
          />
        ) : undefined
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
        <Stack gap="lg">
          <Card variant="outlined">
            <Stack gap="md">
              <Inline justify="space-between" align="flex-start">
                <View style={{ flex: 1 }}>
                  <DetailRow label="청구번호" value={`#${detail.id}`} />
                  <DetailRow
                    label="접수일시"
                    value={formatClaimDate(detail.submittedAt)}
                  />
                </View>
                {status ? (
                  <Badge label={status.label} tone={status.tone} />
                ) : null}
              </Inline>
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
              <Button
                label="고객 상세 보기"
                size="sm"
                variant="secondary"
                onPress={() => onOpenCustomer(detail.customerId)}
              />
            </Stack>
          </Card>

          <Section title="요청 내용">
            <Card variant="filled">
              <AppText>{claimMessage(detail.title, detail.memo)}</AppText>
            </Card>
          </Section>

          <Section title={`첨부 파일 ${detail.files.length}개`}>
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
                  <AttachmentCard
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
          </Section>

          <Section title="상태 변경">
            <Card variant="outlined">
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
                  numberOfLines={5}
                  maxLength={255}
                />
                {error ? (
                  <AppText color="danger">{error.message}</AppText>
                ) : null}
                {statusNotice ? (
                  <AppText color="success">{statusNotice}</AppText>
                ) : null}
              </Stack>
            </Card>
          </Section>

          <Section title="상태 이력">
            {detail.statusLogs.length ? (
              detail.statusLogs.map((log) => (
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
              ))
            ) : (
              <EmptyState title="상태 이력이 없습니다" compact />
            )}
          </Section>
        </Stack>
      )}
    </ModalShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Stack gap="sm">
      <AppText variant="sectionTitle">{title}</AppText>
      {children}
    </Stack>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <Inline justify="space-between" align="flex-start">
      <AppText variant="label">{label}</AppText>
      <AppText style={{ flex: 1 }} align="right">
        {value}
      </AppText>
    </Inline>
  );
}

function AttachmentCard({
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
  return (
    <Card variant="outlined">
      <Stack gap="sm">
        <AppText variant="bodyStrong">{file.fileName}</AppText>
        <AppText variant="caption">
          {claimFileTypeLabel(file.contentType)} ·{" "}
          {formatClaimFileSize(file.fileSize)}
          {file.uploadedAt ? ` · ${formatClaimDate(file.uploadedAt)}` : ""}
        </AppText>
        <Inline wrap>
          <Button
            label="미리보기"
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
            variant="secondary"
            loading={sharing}
            onPress={() => onShare(file)}
          />
        </Inline>
      </Stack>
    </Card>
  );
}
