import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomerDetailBack } from "../customers/customerWorkspaceNavigation";
import { customerQueryKeys } from "../customers/queryKeys";
import { useAuth } from "../../auth/AuthProvider";
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
  ModalShell,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { getCustomer } from "../customers/customersApi";
import {
  buildCustomerFolderBreadcrumb,
  customerFileWorkspaceQueryKey,
  customerFolderWorkspaceQueryKey,
  CUSTOMER_FOLDER_NAME_MAX_LENGTH,
  filterFilesForFolder,
  formatCustomerFolderLocationLabel,
  leaveCustomerFolder,
  listChildFolders,
  resetCustomerFolderNavState,
  validateCustomerFolderName,
} from "./customerFileFolderModel";
import {
  createCustomerFolder,
  deleteCustomerFile,
  listCustomerFiles,
  listCustomerFolders,
  uploadCustomerFile,
} from "./customerWorkspaceApi";
import {
  downloadStorageFileById,
  previewStorageFileById,
} from "../files/storageFileAccess";
import {
  formatWorkspaceBytes,
  formatWorkspaceDate,
  workspaceFileTypeLabel,
} from "./customerWorkspaceModel";
import type { CustomerFile, CustomerFolder } from "./types";

type ListRow =
  | { kind: "folder"; key: string; folder: CustomerFolder }
  | { kind: "file"; key: string; file: CustomerFile };

export function CustomerFilesScreen({ customerId }: { customerId: number }) {
  const { token } = useAuth();
  const onBackPress = useCustomerDetailBack(customerId);
  const client = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [folderId, setFolderId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [folderNameError, setFolderNameError] = useState("");
  const [deleting, setDeleting] = useState<CustomerFile | null>(null);
  const [actionError, setActionError] = useState("");
  const [sharingId, setSharingId] = useState<number | null>(null);

  useEffect(() => {
    setFolderId(resetCustomerFolderNavState().folderId);
    setCreateOpen(false);
    setFolderName("");
    setFolderNameError("");
    setActionError("");
    setSharingId(null);
    setDeleting(null);
  }, [customerId]);

  const filesKey = customerFileWorkspaceQueryKey(customerId);
  const foldersKey = customerFolderWorkspaceQueryKey(customerId);

  const customer = useQuery({
    queryKey: customerQueryKeys.detail(customerId),
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token && customerId),
  });
  const foldersQuery = useQuery({
    queryKey: foldersKey,
    queryFn: () => listCustomerFolders(token, customerId),
    enabled: Boolean(token && customerId),
  });
  const filesQuery = useQuery({
    queryKey: filesKey,
    queryFn: () => listCustomerFiles(token, customerId),
    enabled: Boolean(token && customerId),
  });

  const invalidateWorkspace = async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: foldersKey }),
      client.invalidateQueries({ queryKey: filesKey }),
    ]);
  };

  const folders = foldersQuery.data ?? [];
  const breadcrumb = useMemo(
    () => buildCustomerFolderBreadcrumb(folders, folderId),
    [folders, folderId],
  );
  const childFolders = useMemo(
    () => listChildFolders(folders, folderId),
    [folders, folderId],
  );
  const visibleFiles = useMemo(
    () => filterFilesForFolder(filesQuery.data ?? [], folderId),
    [filesQuery.data, folderId],
  );
  const listRows = useMemo<ListRow[]>(
    () => [
      ...childFolders.map((folder) => ({
        kind: "folder" as const,
        key: `folder-${folder.id}`,
        folder,
      })),
      ...visibleFiles.map((file) => ({
        kind: "file" as const,
        key: `file-${file.id}`,
        file,
      })),
    ],
    [childFolders, visibleFiles],
  );

  const createFolder = useMutation({
    mutationFn: async () => {
      const validationError = validateCustomerFolderName(folderName);
      if (validationError) throw new Error(validationError);
      return createCustomerFolder(token, customerId, folderName, folderId);
    },
    onSuccess: async () => {
      setCreateOpen(false);
      setFolderName("");
      setFolderNameError("");
      await invalidateWorkspace();
    },
    onError: (error) => {
      setFolderNameError(
        error instanceof Error ? error.message : "폴더를 만들지 못했습니다.",
      );
    },
  });

  const upload = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      await uploadCustomerFile(token, customerId, result.assets[0], folderId);
    },
    onSuccess: async () => {
      await invalidateWorkspace();
    },
  });

  const remove = useMutation({
    mutationFn: (file: CustomerFile) => deleteCustomerFile(token, file.id),
    onSuccess: async () => {
      setDeleting(null);
      await invalidateWorkspace();
    },
  });

  async function open(file: CustomerFile) {
    setActionError("");
    try {
      await previewStorageFileById(token, file.id);
    } catch (error) {
      if (__DEV__) {
        console.warn("[CustomerFilesScreen] preview failed", {
          fileId: file.id,
          fileName: file.displayName || file.fileName,
          error: error instanceof Error ? error.message : error,
        });
      }
      setActionError(
        error instanceof Error ? error.message : "파일을 불러오지 못했습니다.",
      );
    }
  }

  async function share(file: CustomerFile) {
    setActionError("");
    setSharingId(file.id);
    try {
      await downloadStorageFileById(
        token,
        file.id,
        file.displayName || file.fileName,
        file.mimeType,
      );
    } catch (error) {
      if (__DEV__) {
        console.warn("[CustomerFilesScreen] download failed", {
          fileId: file.id,
          fileName: file.displayName || file.fileName,
          error: error instanceof Error ? error.message : error,
        });
      }
      setActionError(
        error instanceof Error ? error.message : "파일 다운로드에 실패했습니다.",
      );
    } finally {
      setSharingId(null);
    }
  }

  function openCreateFolder() {
    setFolderName("");
    setFolderNameError("");
    setCreateOpen(true);
  }

  function submitCreateFolder() {
    const validationError = validateCustomerFolderName(folderName);
    if (validationError) {
      setFolderNameError(validationError);
      return;
    }
    createFolder.mutate();
  }

  const locationLabel = formatCustomerFolderLocationLabel(breadcrumb);
  const totalCount = childFolders.length + visibleFiles.length;
  const isLoading = foldersQuery.isLoading || filesQuery.isLoading;
  const isError = foldersQuery.isError || filesQuery.isError;
  const queryError = foldersQuery.error ?? filesQuery.error;

  return (
    <View style={styles.root}>
      <AppHeader
        title={`${customer.data?.name ?? "고객"} 파일`}
        showMenu={false}
        showBack
        onBackPress={onBackPress}
      />
      <Screen padded={false}>
        <FlatList
          data={listRows}
          keyExtractor={(item) => item.key}
          extraData={sharingId}
          contentContainerStyle={styles.content}
          refreshing={foldersQuery.isRefetching || filesQuery.isRefetching}
          onRefresh={() => void Promise.all([foldersQuery.refetch(), filesQuery.refetch()])}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Stack gap="md" style={styles.listHeader}>
              <Inline justify="space-between" align="flex-start">
                <View style={styles.copy}>
                  <AppText variant="heading">고객 파일</AppText>
                  <AppText variant="caption" numberOfLines={2}>
                    {locationLabel}
                  </AppText>
                </View>
                <Badge label={`${totalCount}개`} tone="info" />
              </Inline>
              {folderId != null ? (
                <Button
                  label="← 상위 폴더"
                  size="sm"
                  variant="secondary"
                  onPress={() =>
                    setFolderId(leaveCustomerFolder({ folderId }, folders).folderId)
                  }
                />
              ) : null}
              <Inline wrap>
                <Button
                  label="+ 폴더 생성"
                  size="sm"
                  variant="secondary"
                  onPress={openCreateFolder}
                />
                <Button
                  label="파일 업로드"
                  size="sm"
                  variant="actionEmphasis"
                  loading={upload.isPending}
                  onPress={() => upload.mutate()}
                />
              </Inline>
              {upload.error ? (
                <AppText color="danger">{upload.error.message}</AppText>
              ) : null}
              {actionError ? <AppText color="danger">{actionError}</AppText> : null}
              {isError ? (
                <ErrorState
                  title="고객 파일을 불러오지 못했습니다"
                  message={
                    queryError instanceof Error
                      ? queryError.message
                      : "잠시 후 다시 시도해 주세요."
                  }
                  onRetry={() =>
                    void Promise.all([foldersQuery.refetch(), filesQuery.refetch()])
                  }
                />
              ) : null}
            </Stack>
          }
          ListEmptyComponent={
            isLoading ? (
              <LoadingState compact message="고객 파일을 불러오는 중…" />
            ) : !isError ? (
              <Stack gap="sm">
                <EmptyState
                  compact
                  title="파일 또는 폴더가 없습니다."
                  message="폴더를 만들거나 파일을 업로드해 주세요."
                />
                <Inline wrap>
                  <Button
                    label="폴더 만들기"
                    size="sm"
                    variant="secondary"
                    onPress={openCreateFolder}
                  />
                  <Button
                    label="파일 업로드"
                    size="sm"
                    variant="actionEmphasis"
                    loading={upload.isPending}
                    onPress={() => upload.mutate()}
                  />
                </Inline>
              </Stack>
            ) : null
          }
          renderItem={({ item }) =>
            item.kind === "folder" ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${item.folder.name} 폴더 열기`}
                onPress={() => setFolderId(item.folder.id)}
              >
                <Card variant="outlined">
                  <Inline justify="space-between" align="center">
                    <Inline align="center" style={styles.folderRow}>
                      <AppText variant="bodyStrong">📁</AppText>
                      <AppText variant="bodyStrong" numberOfLines={1} style={styles.folderName}>
                        {item.folder.name}
                      </AppText>
                    </Inline>
                    <AppText variant="caption" color="textSecondary">›</AppText>
                  </Inline>
                </Card>
              </Pressable>
            ) : (
              <Card variant="outlined">
                <Stack gap="sm">
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {item.file.displayName || item.file.fileName}
                  </AppText>
                  <AppText variant="caption">
                    {workspaceFileTypeLabel(item.file.mimeType)} ·{" "}
                    {formatWorkspaceBytes(item.file.fileSize)} ·{" "}
                    {formatWorkspaceDate(item.file.createdAt)}
                  </AppText>
                  <Inline wrap>
                    <Button
                      label="미리보기"
                      size="sm"
                      variant="secondary"
                      onPress={() => void open(item.file)}
                    />
                    <Button
                      label="다운로드/공유"
                      size="sm"
                      variant="secondary"
                      loading={sharingId === item.file.id}
                      disabled={sharingId != null}
                      onPress={() => void share(item.file)}
                    />
                    <Button
                      label="삭제"
                      size="sm"
                      variant="danger"
                      onPress={() => setDeleting(item.file)}
                    />
                  </Inline>
                </Stack>
              </Card>
            )
          }
        />
      </Screen>
      <ModalShell
        open={createOpen}
        title="새 폴더 만들기"
        presentation="dialog"
        scroll={false}
        busy={createFolder.isPending}
        closeOnBackdrop={!createFolder.isPending}
        onRequestClose={() => {
          if (!createFolder.isPending) setCreateOpen(false);
        }}
        footer={
          <Inline>
            <Button
              label="취소"
              variant="secondary"
              disabled={createFolder.isPending}
              onPress={() => setCreateOpen(false)}
              style={styles.footerButton}
            />
            <Button
              label="만들기"
              variant="actionEmphasis"
              loading={createFolder.isPending}
              disabled={!folderName.trim()}
              onPress={submitCreateFolder}
              style={styles.footerButton}
            />
          </Inline>
        }
      >
        <Stack gap="md">
          <TextField
            label="폴더 이름"
            value={folderName}
            onChangeText={(value) => {
              setFolderName(value);
              setFolderNameError("");
            }}
            maxLength={CUSTOMER_FOLDER_NAME_MAX_LENGTH}
            autoFocus
          />
          {folderNameError ? (
            <AppText variant="caption" color="danger">{folderNameError}</AppText>
          ) : (
            <AppText variant="caption" color="textSecondary">
              최대 {CUSTOMER_FOLDER_NAME_MAX_LENGTH}자, 한글/영문/숫자/공백만 사용할 수 있습니다.
            </AppText>
          )}
        </Stack>
      </ModalShell>
      <ConfirmDialog
        open={Boolean(deleting)}
        title="고객 파일 삭제"
        message={`${deleting?.displayName ?? "이 파일"}을 삭제하시겠습니까?`}
        confirmLabel="삭제"
        tone="danger"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => (deleting ? remove.mutateAsync(deleting) : undefined)}
      />
    </View>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.huge,
      gap: theme.spacing.md,
    },
    listHeader: { paddingBottom: theme.spacing.md },
    separator: { height: theme.spacing.sm },
    copy: { flex: 1, minWidth: 0 },
    folderRow: { flex: 1, minWidth: 0, gap: theme.spacing.sm },
    folderName: { flex: 1, minWidth: 0 },
    footerButton: { flex: 1 },
  });
}
