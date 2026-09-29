import { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
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
} from '../../design-system';
import { deleteTeamPost, getTeamPosts } from './teamApi';
import {
  canDeleteTeamPost,
  canEditTeamPost,
  formatTeamDate,
  teamAuthorLabel,
} from './teamModel';
import { teamQueryKeys } from './queryKeys';
import { TeamPostComments } from './TeamPostComments';
import { TeamPostFormModal } from './TeamPostFormModal';
import type { TeamPost } from './types';

export function TeamPostsScreen() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamPost | null>(null);
  const [deleting, setDeleting] = useState<TeamPost | null>(null);
  const query = useQuery({
    queryKey: teamQueryKeys.posts,
    queryFn: () => getTeamPosts(token),
    enabled: Boolean(token),
  });
  const remove = useMutation({
    mutationFn: (postId: string) => deleteTeamPost(token, postId),
    onSuccess: async () => {
      setDeleting(null);
      if (expandedId && deleting?.id === expandedId) setExpandedId(null);
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.posts });
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.files });
    },
  });

  return (
    <View style={styles.root}>
      <AppHeader title="팀 게시판" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Inline justify="space-between">
            <View style={styles.copy}>
              <AppText variant="heading">팀 게시글</AppText>
              <AppText variant="caption">공지와 업무 내용을 팀원과 공유합니다.</AppText>
            </View>
            {query.data?.teamId ? (
              <Button
                label="글 작성"
                size="sm"
                onPress={() => {
                  setEditing(null);
                  setFormOpen(true);
                }}
              />
            ) : null}
          </Inline>
          {query.isLoading ? (
            <LoadingState message="팀 게시글을 불러오는 중…" />
          ) : query.isError || !query.data ? (
            <ErrorState
              title="팀 게시글을 불러오지 못했습니다"
              message={
                query.error instanceof Error
                  ? query.error.message
                  : '잠시 후 다시 시도해 주세요.'
              }
              onRetry={() => void query.refetch()}
            />
          ) : !query.data.teamId ? (
            <Card variant="filled">
              <Stack gap="xs">
                <AppText variant="bodyStrong">소속된 팀이 없습니다.</AppText>
                <AppText variant="caption">
                  먼저 팀원리스트에서 팀을 만들거나 팀 코드로 연결해 주세요.
                </AppText>
              </Stack>
            </Card>
          ) : query.data.posts.length === 0 ? (
            <Card variant="outlined">
              <AppText color="textSecondary" align="center">
                등록된 글이 없습니다.
              </AppText>
            </Card>
          ) : (
            query.data.posts.map((post) => {
              const expanded = expandedId === post.id;
              const canManage = canEditTeamPost(
                post,
                user?.id,
                query.data.ownerId,
                user?.role,
              );
              const canDelete = canDeleteTeamPost(
                post,
                user?.id,
                query.data.ownerId,
                user?.role,
              );
              return (
                <Card
                  key={post.id}
                  variant={post.isNotice ? 'filled' : 'outlined'}
                  style={post.isNotice ? styles.noticeCard : undefined}
                >
                  <Stack gap="sm">
                    <Inline justify="space-between" align="flex-start">
                      <View style={styles.copy}>
                        <Inline wrap>
                          {post.isNotice ? <Badge label="공지" tone="warning" /> : null}
                          <AppText variant="subheading">{post.title}</AppText>
                        </Inline>
                        <AppText variant="caption">
                          {teamAuthorLabel(post)} · {formatTeamDate(post.createdAt)}
                        </AppText>
                      </View>
                      {canManage ? (
                        <Inline gap="xs">
                          <Button
                            label="수정"
                            variant="ghost"
                            size="sm"
                            onPress={() => {
                              setEditing(post);
                              setFormOpen(true);
                            }}
                          />
                          {canDelete ? (
                            <Button
                              label="삭제"
                              variant="danger"
                              size="sm"
                              onPress={() => setDeleting(post)}
                            />
                          ) : null}
                        </Inline>
                      ) : null}
                    </Inline>
                    <AppText color="textSecondary" numberOfLines={expanded ? undefined : 4}>
                      {post.content || '내용 없음'}
                    </AppText>
                    {post.attachments.map((file) => (
                      <Pressable
                        key={file.id}
                        accessibilityRole="link"
                        onPress={() => void Linking.openURL(file.fileUrl)}
                      >
                        <AppText color="primary">📎 {file.fileName}</AppText>
                      </Pressable>
                    ))}
                    <Button
                      label={expanded ? '접기' : '펼치기 · 댓글'}
                      variant="secondary"
                      size="sm"
                      onPress={() => setExpandedId(expanded ? null : post.id)}
                    />
                    {expanded ? <TeamPostComments postId={post.id} /> : null}
                  </Stack>
                </Card>
              );
            })
          )}
        </ScrollView>
      </Screen>
      <TeamPostFormModal
        open={formOpen}
        post={editing}
        canSetNotice={Boolean(query.data?.ownerId && query.data.ownerId === user?.id)}
        onClose={() => setFormOpen(false)}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        title="게시글 삭제"
        message={`「${deleting?.title ?? ''}」글을 삭제하시겠습니까? 첨부 파일도 함께 제거됩니다.`}
        confirmLabel="삭제"
        tone="danger"
        busy={remove.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          if (deleting) remove.mutate(deleting.id);
        }}
      />
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
    copy: { flex: 1, gap: theme.spacing.xs },
    noticeCard: { backgroundColor: theme.colors.warningSoft },
  });
}
