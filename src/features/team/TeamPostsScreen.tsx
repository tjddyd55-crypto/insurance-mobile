import { useMemo, useState } from 'react';
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { AppText, Badge, Button, Card, Inline, Screen, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { getTeamPosts } from './teamApi';
import { canEditTeamPost, formatTeamDate, teamAuthorLabel } from './teamModel';
import { teamQueryKeys } from './queryKeys';
import { TeamPostComments } from './TeamPostComments';
import { TeamPostFormModal } from './TeamPostFormModal';
import type { TeamPost } from './types';

export function TeamPostsScreen() {
  const { token, user } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TeamPost | null>(null);
  const query = useQuery({ queryKey: teamQueryKeys.posts, queryFn: () => getTeamPosts(token), enabled: Boolean(token) });

  return (
    <View style={styles.root}>
      <AppHeader title="팀 게시판" />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}>
          <Inline justify="space-between"><View><AppText variant="heading">팀 게시글</AppText><AppText variant="caption">공지와 업무 내용을 팀원과 공유합니다.</AppText></View><Button label="글 작성" size="sm" onPress={() => { setEditing(null); setFormOpen(true); }} /></Inline>
          {query.isLoading ? <LoadingState message="팀 게시글을 불러오는 중…" /> : query.isError || !query.data ? <ErrorState title="팀 게시글을 불러오지 못했습니다" message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void query.refetch()} /> : query.data.posts.length === 0 ? <Card variant="outlined"><AppText color="textSecondary" align="center">등록된 글이 없습니다.</AppText></Card> : query.data.posts.map((post) => {
            const expanded = expandedId === post.id;
            return (
              <Card key={post.id} variant={post.isNotice ? 'filled' : 'outlined'} style={post.isNotice ? styles.noticeCard : undefined}>
                <Stack gap="sm">
                  <Inline justify="space-between" align="flex-start"><View style={styles.copy}><Inline wrap>{post.isNotice ? <Badge label="공지" tone="warning" /> : null}<AppText variant="subheading">{post.title}</AppText></Inline><AppText variant="caption">{teamAuthorLabel(post)} · {formatTeamDate(post.createdAt)}</AppText></View>{canEditTeamPost(post, user?.id, query.data.ownerId, user?.role) ? <Button label="수정" variant="ghost" size="sm" onPress={() => { setEditing(post); setFormOpen(true); }} /> : null}</Inline>
                  <AppText color="textSecondary" numberOfLines={expanded ? undefined : 4}>{post.content || '내용 없음'}</AppText>
                  {post.attachments.map((file) => <Pressable key={file.id} accessibilityRole="link" onPress={() => void Linking.openURL(file.fileUrl)}><AppText color="primary">📎 {file.fileName}</AppText></Pressable>)}
                  <Button label={expanded ? '접기' : '펼치기 · 댓글'} variant="secondary" size="sm" onPress={() => setExpandedId(expanded ? null : post.id)} />
                  {expanded ? <TeamPostComments postId={post.id} /> : null}
                </Stack>
              </Card>
            );
          })}
        </ScrollView>
      </Screen>
      <TeamPostFormModal open={formOpen} post={editing} canSetNotice={Boolean(query.data?.ownerId && query.data.ownerId === user?.id)} onClose={() => setFormOpen(false)} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md },
    copy: { flex: 1, gap: theme.spacing.xs },
    noticeCard: { backgroundColor: theme.colors.warningSoft },
  });
}
