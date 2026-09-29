import { useMemo, useState } from "react";
import {
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
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
  Inline,
  ModalShell,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import {
  createStorageFolder,
  createStorageOpenUrl,
  deleteStorageFile,
  deleteStorageFolder,
  getStorageQuota,
  getStorageUsageBreakdown,
  listStorageFiles,
  listStorageFolders,
  renameStorageFile,
  renameStorageFolder,
  uploadStorageFile,
} from "./storageApi";
import {
  calculateStorageUsageRatio,
  formatStorageDate,
  formatStorageFileType,
  formatStorageSize,
} from "./storageModel";
import type { StorageFile, StorageFolder } from "./types";
const ROOT = ["storage"] as const;
type RenameTarget =
  | { kind: "folder"; value: StorageFolder }
  | { kind: "file"; value: StorageFile };
type DeleteTarget = RenameTarget;
export function StorageScreen() {
  const { token } = useAuth();
  const qc = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [folderName, setFolderName] = useState("");
  const [rename, setRename] = useState<RenameTarget | null>(null);
  const [renameName, setRenameName] = useState("");
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  const folders = useQuery({
    queryKey: [...ROOT, "folders"],
    queryFn: () => listStorageFolders(token),
    enabled: Boolean(token),
  });
  const files = useQuery({
    queryKey: [...ROOT, "files", folderId],
    queryFn: () => listStorageFiles(token, folderId),
    enabled: Boolean(token),
  });
  const quota = useQuery({
    queryKey: [...ROOT, "quota"],
    queryFn: () => getStorageQuota(token),
    enabled: Boolean(token),
  });
  const usage = useQuery({
    queryKey: [...ROOT, "usage"],
    queryFn: () => getStorageUsageBreakdown(token),
    enabled: Boolean(token),
  });
  const refresh = async () => {
    await Promise.all([
      folders.refetch(),
      files.refetch(),
      quota.refetch(),
      usage.refetch(),
    ]);
  };
  const createFolder = useMutation({
    mutationFn: () => createStorageFolder(token, folderName, folderId),
    onSuccess: async () => {
      setFolderName("");
      await qc.invalidateQueries({ queryKey: [...ROOT, "folders"] });
    },
  });
  const renameMutation = useMutation({
    mutationFn: () =>
      rename?.kind === "folder"
        ? renameStorageFolder(token, rename.value.id, renameName)
        : rename
          ? renameStorageFile(token, rename.value.id, renameName)
          : Promise.resolve(),
    onSuccess: async () => {
      setRename(null);
      await qc.invalidateQueries({ queryKey: ROOT });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: () =>
      deleting?.kind === "folder"
        ? deleteStorageFolder(token, deleting.value.id)
        : deleting
          ? deleteStorageFile(token, deleting.value.id)
          : Promise.resolve(),
    onSuccess: async () => {
      if (deleting?.kind === "folder" && folderId === deleting.value.id)
        setFolderId(null);
      setDeleting(null);
      await qc.invalidateQueries({ queryKey: ROOT });
    },
  });
  const upload = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      await uploadStorageFile(token, asset, folderId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ROOT });
    },
  });
  async function openFile(file: StorageFile) {
    await Linking.openURL(await createStorageOpenUrl(token, file.id));
  }
  const rootFolders = (folders.data ?? []).filter(
    (folder) => folder.parentId === folderId,
  );
  const visibleFiles = files.data ?? [];
  const usageRatio = quota.data
    ? calculateStorageUsageRatio(quota.data.usedBytes, quota.data.limitBytes)
    : 0;
  return (
    <View style={styles.root}>
      <AppHeader title="내 저장공간" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={folders.isRefetching || files.isRefetching}
              onRefresh={() => void refresh()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Card variant="filled">
            <Stack gap="md">
              <AppText variant="sectionTitle">저장공간 사용량</AppText>
              {quota.data ? (
                <>
                  <Inline justify="space-between" align="flex-end">
                    <View>
                      <AppText variant="numeric">
                        {formatStorageSize(quota.data.usedBytes)}
                      </AppText>
                      <AppText variant="caption">
                        총 {formatStorageSize(quota.data.limitBytes)}
                      </AppText>
                    </View>
                    <Badge
                      label={`${Math.round(usageRatio * 100)}% 사용`}
                      tone={usageRatio >= 0.9 ? "warning" : "info"}
                    />
                  </Inline>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityValue={{
                      min: 0,
                      max: 100,
                      now: Math.round(usageRatio * 100),
                    }}
                    style={styles.progressTrack}
                  >
                    <View
                      style={[styles.progressValue, { width: `${usageRatio * 100}%` }]}
                    />
                  </View>
                </>
              ) : (
                <AppText variant="caption">사용량을 불러오는 중…</AppText>
              )}
              {quota.data?.pendingUploadBytes ? (
                <AppText variant="caption">
                  업로드 처리 중{" "}
                  {formatStorageSize(quota.data.pendingUploadBytes)}
                </AppText>
              ) : null}
            </Stack>
          </Card>
          {usage.data ? (
            <Card variant="outlined">
              <Stack gap="md">
                <Inline justify="space-between">
                  <View style={styles.grow}>
                    <AppText variant="sectionTitle">파일 사용처</AppText>
                    <AppText variant="caption">
                      고객 파일과 청구 첨부를 포함한 전체 사용 현황입니다.
                    </AppText>
                  </View>
                  <Badge label={`${usage.data.totalCount}개`} tone="info" />
                </Inline>
                {usage.data.summary.map((item) => (
                  <Inline key={item.source || item.label} justify="space-between">
                    <AppText>{item.label}</AppText>
                    <AppText variant="caption">
                      {item.count}개 · {formatStorageSize(item.size)}
                    </AppText>
                  </Inline>
                ))}
              </Stack>
            </Card>
          ) : null}
          {usage.isError ? (
            <AppText color="danger">
              전체 파일 사용 현황을 불러오지 못했습니다. 아래 내 파일은 계속 사용할 수
              있습니다.
            </AppText>
          ) : null}
          <Inline wrap>
            <Button
              label="전체 파일"
              size="sm"
              variant={folderId == null ? "selected" : "secondary"}
              onPress={() => setFolderId(null)}
            />
            {folderId != null ? (
              <Button
                label="상위로"
                size="sm"
                variant="secondary"
                onPress={() =>
                  setFolderId(
                    (folders.data ?? []).find((item) => item.id === folderId)
                      ?.parentId ?? null,
                  )
                }
              />
            ) : null}
            <Button
              label="파일 업로드"
              variant="actionEmphasis"
              size="sm"
              loading={upload.isPending}
              onPress={() => upload.mutate()}
            />
          </Inline>
          <Inline align="flex-end">
            <TextField
              label="새 폴더"
              placeholder="폴더 이름"
              value={folderName}
              onChangeText={setFolderName}
              containerStyle={styles.grow}
            />
            <Button
              label="만들기"
              size="sm"
              disabled={!folderName.trim()}
              loading={createFolder.isPending}
              onPress={() => createFolder.mutate()}
            />
          </Inline>
          {upload.error || createFolder.error ? (
            <AppText color="danger">
              {(upload.error ?? createFolder.error) instanceof Error
                ? ((upload.error ?? createFolder.error)?.message ??
                  "요청을 처리하지 못했습니다.")
                : "요청을 처리하지 못했습니다."}
            </AppText>
          ) : null}
          {folders.isError || files.isError ? (
            <ErrorState
              title="저장공간을 불러오지 못했습니다"
              message={
                (folders.error ?? files.error) instanceof Error
                  ? ((folders.error ?? files.error)?.message ??
                    "잠시 후 다시 시도해 주세요.")
                  : "잠시 후 다시 시도해 주세요."
              }
              onRetry={() => void refresh()}
            />
          ) : null}
          <Inline justify="space-between">
            <AppText variant="sectionTitle">
              {folderId == null ? "전체 파일" : "폴더 파일"}
            </AppText>
            <Badge
              label={`${rootFolders.length}개 폴더 · ${visibleFiles.length}개 파일`}
            />
          </Inline>
          {rootFolders.map((folder) => (
            <Card key={`folder-${folder.id}`} variant="outlined">
              <Inline justify="space-between">
                <Button
                  label={`📁 ${folder.name}`}
                  variant="ghost"
                  onPress={() => setFolderId(folder.id)}
                  style={styles.grow}
                />
                <Inline gap="xs">
                  <Button
                    label="이름"
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setRename({ kind: "folder", value: folder });
                      setRenameName(folder.name);
                    }}
                  />
                  <Button
                    label="삭제"
                    size="sm"
                    variant="danger"
                    onPress={() =>
                      setDeleting({ kind: "folder", value: folder })
                    }
                  />
                </Inline>
              </Inline>
            </Card>
          ))}
          {visibleFiles.map((file) => (
            <Card key={`file-${file.id}`} variant="outlined">
              <Stack gap="sm">
                <Inline justify="space-between" align="flex-start">
                  <View style={styles.grow}>
                    <AppText variant="bodyStrong" numberOfLines={2}>
                      📄 {file.displayName}
                    </AppText>
                    <AppText variant="caption">
                      {formatStorageFileType(file.mimeType)} ·{" "}
                      {formatStorageSize(file.fileSize)} ·{" "}
                      {formatStorageDate(file.createdAt)}
                    </AppText>
                  </View>
                  <Button
                    label="열기"
                    variant="action"
                    size="sm"
                    onPress={() => void openFile(file)}
                  />
                </Inline>
                <Inline justify="flex-end">
                  <Button
                    label="이름 변경"
                    size="sm"
                    variant="ghost"
                    onPress={() => {
                      setRename({ kind: "file", value: file });
                      setRenameName(file.displayName);
                    }}
                  />
                  <Button
                    label="삭제"
                    size="sm"
                    variant="danger"
                    onPress={() => setDeleting({ kind: "file", value: file })}
                  />
                </Inline>
              </Stack>
            </Card>
          ))}
          {!rootFolders.length &&
          !files.data?.length &&
          !folders.isLoading &&
          !files.isLoading ? (
            <Card variant="outlined">
              <AppText color="textSecondary" align="center">
                이 위치에 파일이나 폴더가 없습니다.
              </AppText>
            </Card>
          ) : null}
        </ScrollView>
      </Screen>
      <ConfirmDialog
        open={Boolean(deleting)}
        title={deleting?.kind === "folder" ? "폴더 삭제" : "파일 삭제"}
        message="삭제하면 되돌릴 수 없습니다. 계속하시겠습니까?"
        confirmLabel="삭제"
        tone="danger"
        busy={deleteMutation.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => deleteMutation.mutate()}
      />
      {rename ? (
        <RenameOverlay
          name={renameName}
          setName={setRenameName}
          busy={renameMutation.isPending}
          onCancel={() => setRename(null)}
          onSave={() => renameMutation.mutate()}
        />
      ) : null}
    </View>
  );
}
function RenameOverlay({
  name,
  setName,
  busy,
  onCancel,
  onSave,
}: {
  name: string;
  setName: (value: string) => void;
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <ModalShell
      open
      title="이름 변경"
      presentation="dialog"
      scroll={false}
      busy={busy}
      closeOnBackdrop={false}
      onRequestClose={onCancel}
      footer={
        <Inline>
          <Button
            label="취소"
            variant="secondary"
            disabled={busy}
            onPress={onCancel}
            style={{ flex: 1 }}
          />
          <Button
            label="저장"
            variant="actionEmphasis"
            loading={busy}
            disabled={!name.trim()}
            onPress={onSave}
            style={{ flex: 1 }}
          />
        </Inline>
      }
    >
      <Stack gap="md">
        <AppText variant="caption">
          파일 또는 폴더를 찾기 쉬운 이름으로 변경합니다.
        </AppText>
        <TextField value={name} onChangeText={setName} autoFocus />
      </Stack>
    </ModalShell>
  );
}
function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    grow: { flex: 1 },
    progressTrack: {
      height: 8,
      overflow: "hidden",
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.border,
    },
    progressValue: {
      height: "100%",
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.primary,
    },
  });
}
