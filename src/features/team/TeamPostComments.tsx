import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { AppText, Button, Inline, Stack, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { createTeamPostComment, deleteTeamPostComment, getTeamPostComments } from './teamApi';
import { formatTeamDate, teamAuthorLabel } from './teamModel';
import { teamQueryKeys } from './queryKeys';
import type { TeamPostComment } from './types';

export function TeamPostComments({ postId }: { postId: string }) {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [content, setContent] = useState('');
  const [deleting, setDeleting] = useState<TeamPostComment | null>(null);
  const queryKey = teamQueryKeys.comments(postId);
  const query = useQuery({ queryKey, queryFn: () => getTeamPostComments(token, postId), enabled: Boolean(token) });
  const createMutation = useMutation({
    mutationFn: () => createTeamPostComment(token, postId, content),
    onSuccess: async () => { setContent(''); await queryClient.invalidateQueries({ queryKey }); },
  });
  const deleteMutation = useMutation({
    mutationFn: (commentId: string) => deleteTeamPostComment(token, commentId),
    onSuccess: async () => { setDeleting(null); await queryClient.invalidateQueries({ queryKey }); },
  });

  return (
    <View style={styles.root}>
      <AppText variant="label">댓글 {query.data?.length ?? 0}개</AppText>
      {query.isLoading ? <AppText variant="caption">댓글을 불러오는 중…</AppText> : null}
      {query.isError ? <AppText color="danger">{query.error instanceof Error ? query.error.message : '댓글을 불러오지 못했습니다.'}</AppText> : null}
      <Stack gap="sm">
        {(query.data ?? []).map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <Inline justify="space-between" align="flex-start">
              <View style={styles.copy}><AppText variant="bodyStrong">{teamAuthorLabel(comment)}</AppText><AppText variant="caption">{formatTeamDate(comment.createdAt)}</AppText></View>
              {comment.authorId === user?.id ? <Button label="삭제" size="sm" variant="ghost" onPress={() => setDeleting(comment)} /> : null}
            </Inline>
            <AppText>{comment.content}</AppText>
          </View>
        ))}
      </Stack>
      <Inline align="flex-end">
        <TextField containerStyle={styles.input} placeholder="댓글 입력" value={content} onChangeText={setContent} maxLength={1000} multiline />
        <Button label="등록" size="sm" loading={createMutation.isPending} disabled={!content.trim()} onPress={() => createMutation.mutate()} />
      </Inline>
      {createMutation.error ? <AppText color="danger">{createMutation.error instanceof Error ? createMutation.error.message : '댓글을 등록하지 못했습니다.'}</AppText> : null}
      <ConfirmDialog open={Boolean(deleting)} title="댓글 삭제" message="댓글을 삭제하시겠습니까?" confirmLabel="삭제" tone="danger" busy={deleteMutation.isPending} onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) deleteMutation.mutate(deleting.id); }} />
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { marginTop: theme.spacing.md, paddingTop: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border, gap: theme.spacing.md },
    comment: { gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSubtle },
    copy: { flex: 1, gap: theme.spacing.xs },
    input: { flex: 1 },
  });
}
