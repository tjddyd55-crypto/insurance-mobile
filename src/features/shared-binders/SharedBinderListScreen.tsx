import { useMemo, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { describeApiError } from '../../api/apiErrorCopy';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Button, Card, Inline, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { formatBinderUpdatedAt, formatFileSize } from '../personal-binders/personalBinderModel';
import { listSharedBinders } from './sharedBindersApi';
import type { SharedBinderSummary } from './sharedBinderModel';
import { sharedBinderQueryKeys } from './queryKeys';
import { useImportSharedBinder } from './useImportSharedBinder';

export const SHARED_BINDER_IMPORT_COPY =
  '파일은 내 저장 공간(1GB)의 「공유 바인더 / 가져온 바인더명」 폴더에 복사됩니다. 가져온 후에는 원본과 독립적으로 편집할 수 있습니다.';

export function sharedBinderMeta(row: SharedBinderSummary): string {
  return [row.ownerName, formatBinderUpdatedAt(row.createdAt ?? undefined), `섹션 ${row.sectionCount}`, `자료 ${row.fileCount}`]
    .filter(Boolean)
    .join(' · ');
}

/** 공유 바인더 목록(같은 GA 지점). 웹 /personal-binders/shared 와 같은 API·동작. */
export function SharedBinderListScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [importTarget, setImportTarget] = useState<SharedBinderSummary | null>(null);
  const query = useQuery({
    queryKey: sharedBinderQueryKeys.list(),
    queryFn: () => listSharedBinders(token),
    enabled: Boolean(token),
  });
  const importMutation = useImportSharedBinder(token);

  return (
    <View style={styles.root}>
      <AppHeader title="공유 바인더" />
      {query.isLoading ? (
        <LoadingState message="공유 바인더를 불러오는 중…" />
      ) : query.isError ? (
        <ErrorState
          title="공유 바인더를 불러오지 못했습니다"
          message={describeApiError(query.error, '잠시 후 다시 시도해 주세요.')}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <FlatList
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} />}
          ListHeaderComponent={
            <AppText variant="caption" color="textSecondary" style={styles.intro}>
              같은 GA 지점에서 공유된 바인더를 열람하고 내 바인더로 가져올 수 있습니다.
            </AppText>
          }
          ListEmptyComponent={<EmptyState title="아직 공유된 바인더가 없습니다." />}
          renderItem={({ item }) => (
            <Card variant="outlined" padding="md">
              <Stack gap="sm">
                <AppText variant="cardTitle" numberOfLines={2}>{item.title}</AppText>
                <AppText variant="caption" color="textSecondary">{sharedBinderMeta(item)}</AppText>
                {item.totalBytes > 0 ? <AppText variant="caption" color="textMuted">용량 {formatFileSize(item.totalBytes)}</AppText> : null}
                <Inline gap="sm">
                  <View style={styles.flex}>
                    <Button
                      label="미리보기"
                      size="sm"
                      variant="secondary"
                      fullWidth
                      onPress={() => router.push({ pathname: '/customer-consulting/shared-binders/[shareId]', params: { shareId: item.id } })}
                    />
                  </View>
                  <View style={styles.flex}>
                    <Button label="내 바인더로 가져오기" size="sm" fullWidth onPress={() => setImportTarget(item)} />
                  </View>
                </Inline>
              </Stack>
            </Card>
          )}
        />
      )}
      <ConfirmDialog
        open={importTarget != null}
        title="내 바인더로 가져오기"
        message={
          importMutation.isError
            ? describeApiError(importMutation.error, '가져오기에 실패했습니다.')
            : `${importTarget?.title ?? ''}\n파일 ${importTarget?.fileCount ?? 0}개 · 예상 용량 ${formatFileSize(importTarget?.totalBytes ?? 0)}\n\n${SHARED_BINDER_IMPORT_COPY}`
        }
        confirmLabel="가져오기"
        busy={importMutation.isPending}
        closeOnBackdrop={!importMutation.isPending}
        onCancel={() => {
          importMutation.reset();
          setImportTarget(null);
        }}
        onConfirm={() => {
          if (!importTarget) return;
          importMutation.mutate(importTarget.id, { onSuccess: () => setImportTarget(null) });
        }}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    list: { padding: theme.layout.screenPaddingHorizontal, gap: theme.spacing.sm, flexGrow: 1 },
    intro: { paddingBottom: theme.spacing.sm },
    flex: { flex: 1 },
  });
}
