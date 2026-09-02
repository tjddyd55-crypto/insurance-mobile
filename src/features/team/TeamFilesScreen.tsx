import { useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { shareRemoteFile } from '../files/remoteFileSharing';
import { getTeamFiles, getTeamMembers } from './teamApi';
import { formatStorageBytes, formatTeamDate } from './teamModel';
import { teamQueryKeys } from './queryKeys';
import type { TeamFile } from './types';

export function TeamFilesScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const filesQuery = useQuery({
    queryKey: teamQueryKeys.files,
    queryFn: () => getTeamFiles(token),
    enabled: Boolean(token),
  });
  const membersQuery = useQuery({
    queryKey: teamQueryKeys.members,
    queryFn: () => getTeamMembers(token),
    enabled: Boolean(token),
  });

  async function openFile(file: TeamFile) {
    await Linking.openURL(file.fileUrl);
  }

  async function shareFile(file: TeamFile) {
    setBusyId(file.id);
    setNotice('');
    try {
      await shareRemoteFile({
        url: file.fileUrl,
        fileName: file.fileName,
        mimeType: null,
      });
      setNotice('공유 시트를 열었습니다.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : '파일 공유에 실패했습니다.');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <View style={styles.root}>
      <AppHeader title="팀 자료" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={filesQuery.isRefetching}
              onRefresh={() => void filesQuery.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Stack gap="xs">
            <AppText variant="heading">팀 자료실</AppText>
            <AppText variant="caption">
              팀 게시글에 첨부된 파일을 한곳에서 확인합니다.
            </AppText>
          </Stack>
          <Card variant="filled">
            <AppText variant="bodyStrong">
              {membersQuery.data && !membersQuery.data.teamId
                ? '소속된 팀이 없습니다.'
                : '팀 저장공간'}
            </AppText>
            <AppText color="textSecondary">
              {membersQuery.isLoading
                ? '사용량 불러오는 중…'
                : membersQuery.data && !membersQuery.data.teamId
                  ? '팀에 연결하면 공유 자료를 확인할 수 있습니다.'
                  : membersQuery.data && membersQuery.data.teamStorageLimitBytes > 0
                    ? `${formatStorageBytes(membersQuery.data.teamStorageUsedBytes)} / ${formatStorageBytes(membersQuery.data.teamStorageLimitBytes)}`
                    : '용량 정보를 표시할 수 없습니다.'}
            </AppText>
          </Card>
          {notice ? <AppText color="success">{notice}</AppText> : null}
          {filesQuery.isLoading ? (
            <LoadingState message="팀 자료를 불러오는 중…" />
          ) : null}
          {filesQuery.isError ? (
            <ErrorState
              title="팀 자료를 불러오지 못했습니다"
              message={
                filesQuery.error instanceof Error
                  ? filesQuery.error.message
                  : '잠시 후 다시 시도해 주세요.'
              }
              onRetry={() => void filesQuery.refetch()}
            />
          ) : null}
          {!filesQuery.isLoading && !filesQuery.isError && !filesQuery.data?.length ? (
            <Card variant="outlined">
              <AppText color="textSecondary" align="center">
                첨부된 자료가 없습니다.
              </AppText>
            </Card>
          ) : null}
          {(filesQuery.data ?? []).map((file) => (
            <Card key={file.id} variant="outlined">
              <Stack gap="sm">
                <AppText variant="bodyStrong">📎 {file.fileName}</AppText>
                <AppText variant="caption">
                  게시글: {file.postTitle || '(제목 없음)'}
                </AppText>
                <AppText variant="caption">{formatTeamDate(file.postCreatedAt)}</AppText>
                <Inline gap="sm">
                  <Button
                    label="열기"
                    size="sm"
                    variant="secondary"
                    onPress={() => void openFile(file)}
                    style={styles.action}
                  />
                  <Button
                    label="공유"
                    size="sm"
                    variant="secondary"
                    loading={busyId === file.id}
                    disabled={busyId != null}
                    onPress={() => void shareFile(file)}
                    style={styles.action}
                  />
                </Inline>
              </Stack>
            </Card>
          ))}
        </ScrollView>
      </Screen>
    </View>
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
    action: { flex: 1 },
  });
}
