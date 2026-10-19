import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';

import { describeApiError } from '../../api/apiErrorCopy';
import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Button, Card, Inline, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { formatFileSize } from '../personal-binders/personalBinderModel';
import { getSharedBinder, openSharedBinderFile } from './sharedBindersApi';
import { sharedBinderPageTotal, sharedItemPageLabel, type SharedBinderItem } from './sharedBinderModel';
import { sharedBinderQueryKeys } from './queryKeys';
import { SHARED_BINDER_IMPORT_COPY, sharedBinderMeta } from './SharedBinderListScreen';
import { useImportSharedBinder } from './useImportSharedBinder';

/**
 * 공유 바인더 상세: 섹션 → 자료(선택 페이지) 구성.
 * 페이지 뷰어는 재구현하지 않는다. "바로 보기"는 같은 BinderViewerScreen 을 공유 출처(shareId)로 열고(가져오지 않음),
 * "가져와서 보기"는 내 바인더로 복사한 뒤 같은 뷰어를 연다.
 * 원본 파일은 기존 원격 파일 helper 로 OS 앱에 넘긴다.
 */
export function SharedBinderDetailScreen({ shareId }: { shareId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [confirmImport, setConfirmImport] = useState(false);
  const validId = /^\d+$/.test(shareId);
  const query = useQuery({
    queryKey: sharedBinderQueryKeys.detail(shareId),
    queryFn: () => getSharedBinder(token, shareId),
    enabled: Boolean(token && validId),
  });
  const importMutation = useImportSharedBinder(token);
  const fileMutation = useMutation({
    mutationFn: (item: SharedBinderItem) => openSharedBinderFile(token, shareId, item),
  });
  const back = () => (router.canGoBack() ? router.back() : router.replace('/customer-consulting/shared-binders'));
  const header = (title: string) => <AppHeader title={title} showBack showMenu={false} onBackPress={back} />;

  if (!validId) {
    return <View style={styles.root}>{header('공유 바인더')}<ErrorState title="공유 바인더를 찾을 수 없습니다" message="잘못된 공유 바인더 주소입니다." /></View>;
  }
  if (query.isLoading) {
    return <View style={styles.root}>{header('공유 바인더')}<LoadingState message="공유 바인더를 불러오는 중…" /></View>;
  }
  if (query.isError || !query.data) {
    return (
      <View style={styles.root}>
        {header('공유 바인더')}
        <ErrorState
          title="공유 바인더를 불러오지 못했습니다"
          message={describeApiError(query.error, '잠시 후 다시 시도해 주세요.')}
          onRetry={() => void query.refetch()}
        />
      </View>
    );
  }

  const binder = query.data;
  const totalPages = sharedBinderPageTotal(binder);
  return (
    <View style={styles.root}>
      {header(binder.title)}
      <ScrollView contentContainerStyle={styles.body}>
        <Stack gap="xs">
          <AppText variant="caption" color="textSecondary">{sharedBinderMeta(binder)}</AppText>
          {binder.description ? <AppText variant="body">{binder.description}</AppText> : null}
          <AppText variant="caption" color="textMuted">상담 페이지 {totalPages}쪽</AppText>
        </Stack>
        <Inline gap="sm">
          <View style={styles.flex}>
            <Button
              label="바로 보기"
              variant="primary"
              fullWidth
              disabled={totalPages === 0}
              onPress={() => router.push({ pathname: '/customer-consulting/shared-binders/[shareId]/view', params: { shareId: binder.id } })}
            />
          </View>
          <View style={styles.flex}>
            <Button label="가져와서 보기" fullWidth onPress={() => setConfirmImport(true)} />
          </View>
        </Inline>
        {fileMutation.isError ? (
          <AppText variant="caption" color="danger" align="center">
            {describeApiError(fileMutation.error, '파일을 열지 못했습니다.')}
          </AppText>
        ) : null}
        {binder.sections.length === 0 ? <EmptyState title="섹션이 없습니다." /> : null}
        {binder.sections.map((section) => (
          <Card key={section.id} variant="outlined" padding="md">
            <Stack gap="sm">
              <AppText variant="sectionTitle">{section.title}</AppText>
              {section.items.length === 0 ? <AppText variant="caption" color="textMuted">자료가 없습니다.</AppText> : null}
              {section.items.map((item) => (
                <Inline key={item.id} justify="space-between" gap="sm" style={styles.item}>
                  <Stack gap="xs" style={styles.flex}>
                    <AppText variant="bodyStrong" numberOfLines={2}>{item.material.title}</AppText>
                    <AppText variant="caption" color="textSecondary">
                      {sharedItemPageLabel(item)}{item.material.fileSize > 0 ? ` · ${formatFileSize(item.material.fileSize)}` : ''}
                    </AppText>
                  </Stack>
                  <Button
                    label="파일 열기"
                    size="sm"
                    variant="secondary"
                    disabled={!item.shareFileId || fileMutation.isPending}
                    loading={fileMutation.isPending && fileMutation.variables?.id === item.id}
                    onPress={() => fileMutation.mutate(item)}
                  />
                </Inline>
              ))}
            </Stack>
          </Card>
        ))}
      </ScrollView>
      <ConfirmDialog
        open={confirmImport}
        title="내 바인더로 가져오기"
        message={importMutation.isError ? describeApiError(importMutation.error, '가져오기에 실패했습니다.') : SHARED_BINDER_IMPORT_COPY}
        confirmLabel="가져오기"
        busy={importMutation.isPending}
        closeOnBackdrop={!importMutation.isPending}
        onCancel={() => {
          importMutation.reset();
          setConfirmImport(false);
        }}
        onConfirm={() => importMutation.mutate(binder.id, { onSuccess: () => setConfirmImport(false) })}
      />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    body: { padding: theme.layout.screenPaddingHorizontal, gap: theme.spacing.md, paddingBottom: theme.spacing.xl },
    item: { paddingVertical: theme.spacing.xs },
    flex: { flex: 1, minWidth: 0 },
  });
}
