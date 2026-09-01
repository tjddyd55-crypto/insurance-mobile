import { useMemo } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { AppText, Card, Screen, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { getTeamFiles, getTeamMembers } from './teamApi';
import { formatStorageBytes, formatTeamDate } from './teamModel';
import { teamQueryKeys } from './queryKeys';

export function TeamFilesScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const filesQuery = useQuery({ queryKey: teamQueryKeys.files, queryFn: () => getTeamFiles(token), enabled: Boolean(token) });
  const membersQuery = useQuery({ queryKey: teamQueryKeys.members, queryFn: () => getTeamMembers(token), enabled: Boolean(token) });

  return (
    <View style={styles.root}>
      <AppHeader title="팀 자료" />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={filesQuery.isRefetching} onRefresh={() => void filesQuery.refetch()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}>
          <Stack gap="xs"><AppText variant="heading">팀 자료실</AppText><AppText variant="caption">팀 게시글에 첨부된 파일을 한곳에서 확인합니다.</AppText></Stack>
          <Card variant="filled"><AppText variant="bodyStrong">{membersQuery.data && !membersQuery.data.teamId ? '소속된 팀이 없습니다.' : '팀 저장공간'}</AppText><AppText color="textSecondary">{membersQuery.isLoading ? '사용량 불러오는 중…' : membersQuery.data && !membersQuery.data.teamId ? '팀에 연결하면 공유 자료를 확인할 수 있습니다.' : membersQuery.data && membersQuery.data.teamStorageLimitBytes > 0 ? `${formatStorageBytes(membersQuery.data.teamStorageUsedBytes)} / ${formatStorageBytes(membersQuery.data.teamStorageLimitBytes)}` : '용량 정보를 표시할 수 없습니다.'}</AppText></Card>
          {filesQuery.isError ? <ErrorState title="팀 자료를 불러오지 못했습니다" message={filesQuery.error instanceof Error ? filesQuery.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void filesQuery.refetch()} /> : null}
          {!filesQuery.isLoading && !filesQuery.isError && !filesQuery.data?.length ? <Card variant="outlined"><AppText color="textSecondary" align="center">첨부된 자료가 없습니다.</AppText></Card> : null}
          {(filesQuery.data ?? []).map((file) => (
            <Pressable key={file.id} accessibilityRole="link" onPress={() => void Linking.openURL(file.fileUrl)} style={({ pressed }) => pressed && styles.pressed}>
              <Card variant="outlined"><Stack gap="sm"><AppText variant="bodyStrong" color="primary">📎 {file.fileName}</AppText><AppText variant="caption">게시글: {file.postTitle || '(제목 없음)'}</AppText><AppText variant="caption">{formatTeamDate(file.postCreatedAt)}</AppText></Stack></Card>
            </Pressable>
          ))}
        </ScrollView>
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({ root: { flex: 1 }, content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md }, pressed: { opacity: theme.opacity.pressed } });
}
