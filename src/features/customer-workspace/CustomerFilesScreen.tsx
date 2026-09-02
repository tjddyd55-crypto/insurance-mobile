import { useEffect, useMemo, useState } from "react";
import { FlatList, Linking, StyleSheet, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCustomerDetailBack } from "../customers/customerWorkspaceNavigation";
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
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from "../../design-system";
import { getCustomer } from "../customers/customersApi";
import {
  deleteCustomerFile,
  listCustomerFiles,
  openCustomerFile,
  uploadCustomerFile,
} from "./customerWorkspaceApi";
import { shareRemoteFile } from "../files/remoteFileSharing";
import {
  formatWorkspaceBytes,
  formatWorkspaceDate,
  workspaceFileTypeLabel,
} from "./customerWorkspaceModel";
import type { CustomerFile } from "./types";
export function CustomerFilesScreen({ customerId }: { customerId: number }) {
  const { token } = useAuth();
  const onBackPress = useCustomerDetailBack(customerId);
  const client = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [deleting, setDeleting] = useState<CustomerFile | null>(null);
  const [actionError, setActionError] = useState("");
  const [sharingId, setSharingId] = useState<number | null>(null);
  useEffect(() => {
    setActionError("");
    setSharingId(null);
  }, [customerId]);
  const key = ["customer-files", customerId] as const;
  const customer = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => getCustomer(token, customerId),
    enabled: Boolean(token && customerId),
  });
  const query = useQuery({
    queryKey: key,
    queryFn: () => listCustomerFiles(token, customerId),
    enabled: Boolean(token && customerId),
  });
  const upload = useMutation({
    mutationFn: async () => {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets[0]) return;
      await uploadCustomerFile(token, customerId, result.assets[0]);
    },
    onSuccess: async () => client.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: (file: CustomerFile) => deleteCustomerFile(token, file.id),
    onSuccess: async () => {
      setDeleting(null);
      await client.invalidateQueries({ queryKey: key });
    },
  });
  async function open(file: CustomerFile) {
    setActionError("");
    try {
      await Linking.openURL(await openCustomerFile(token, file.id));
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "파일을 열지 못했습니다.",
      );
    }
  }
  async function share(file: CustomerFile) {
    setActionError("");
    setSharingId(file.id);
    try {
      const url = await openCustomerFile(token, file.id);
      await shareRemoteFile({
        url,
        fileName: file.displayName || file.fileName,
        mimeType: file.mimeType,
      });
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "파일을 공유하지 못했습니다.",
      );
    } finally {
      setSharingId(null);
    }
  }
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
          data={query.data ?? []}
          keyExtractor={(item) => String(item.id)}
          extraData={sharingId}
          contentContainerStyle={styles.content}
          refreshing={query.isRefetching}
          onRefresh={() => void query.refetch()}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Stack gap="md" style={styles.listHeader}>
              <Inline justify="space-between" align="flex-start">
                <View style={styles.copy}>
                  <AppText variant="heading">고객 파일</AppText>
                  <AppText variant="caption">
                    {customer.data?.name ?? `고객 #${customerId}`} 전용 보관함
                  </AppText>
                </View>
                <Badge label={`${query.data?.length ?? 0}개`} tone="info" />
              </Inline>
              <Button
                label="파일 업로드"
                variant="actionEmphasis"
                fullWidth
                loading={upload.isPending}
                onPress={() => upload.mutate()}
              />
              {upload.error ? (
                <AppText color="danger">{upload.error.message}</AppText>
              ) : null}
              {actionError ? (
                <AppText color="danger">{actionError}</AppText>
              ) : null}
              {query.isError ? (
                <ErrorState
                  title="고객 파일을 불러오지 못했습니다"
                  message={
                    query.error instanceof Error
                      ? query.error.message
                      : "잠시 후 다시 시도해 주세요."
                  }
                  onRetry={() => void query.refetch()}
                />
              ) : null}
            </Stack>
          }
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingState compact message="고객 파일을 불러오는 중…" />
            ) : !query.isError ? (
              <EmptyState compact title="등록된 고객 파일이 없습니다" />
            ) : null
          }
          renderItem={({ item: file }) => (
            <Card variant="outlined">
              <Stack gap="sm">
                <AppText variant="bodyStrong" numberOfLines={1}>
                  {file.displayName || file.fileName}
                </AppText>
                <AppText variant="caption">
                  {workspaceFileTypeLabel(file.mimeType)} ·{" "}
                  {formatWorkspaceBytes(file.fileSize)} ·{" "}
                  {formatWorkspaceDate(file.createdAt)}
                </AppText>
                <Inline wrap>
                  <Button
                    label="미리보기"
                    size="sm"
                    variant="secondary"
                    onPress={() => void open(file)}
                  />
                  <Button
                    label="다운로드/공유"
                    size="sm"
                    variant="secondary"
                    loading={sharingId === file.id}
                    disabled={sharingId != null}
                    onPress={() => void share(file)}
                  />
                  <Button
                    label="삭제"
                    size="sm"
                    variant="danger"
                    onPress={() => setDeleting(file)}
                  />
                </Inline>
              </Stack>
            </Card>
          )}
        />
      </Screen>
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
  });
}
