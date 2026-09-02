import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';

import { useAuth } from '../../auth/AuthProvider';
import { AppText, Button, Card, Inline, Stack, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { createTeamPost, updateTeamPost } from './teamApi';
import { teamQueryKeys } from './queryKeys';
import type { TeamPost } from './types';
import { TEAM_ATTACHMENT_TYPES, uploadTeamPostAttachments } from './teamAttachmentUpload';

type Props = {
  open: boolean;
  post: TeamPost | null;
  canSetNotice: boolean;
  onClose: () => void;
};

export function TeamPostFormModal({ open, post, canSetNotice, onClose }: Props) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [files, setFiles] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [fileError, setFileError] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle(post?.title ?? '');
    setContent(post?.content ?? '');
    setIsNotice(Boolean(post?.isNotice));
    setFiles([]);
    setFileError('');
  }, [open, post]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (post) return updateTeamPost(token, post.id, { title, content, isNotice });
      const attachments = await uploadTeamPostAttachments(token, files);
      return createTeamPost(token, { title, content, isNotice, attachments });
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: teamQueryKeys.posts });
      onClose();
    },
  });
  const valid = title.trim().length > 0 && content.trim().length > 0;

  async function chooseFiles() {
    setFileError('');
    const result = await DocumentPicker.getDocumentAsync({ type: [...TEAM_ATTACHMENT_TYPES], multiple: true, copyToCacheDirectory: true });
    if (result.canceled) return;
    if (result.assets.length > 10) { setFileError('첨부파일은 최대 10개까지 선택할 수 있습니다.'); return; }
    setFiles(result.assets);
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={() => { if (!mutation.isPending) onClose(); }}>
      <View style={styles.root}>
        <View style={styles.header}>
          <AppText variant="heading">{post ? '게시글 수정' : '새 게시글'}</AppText>
          <Button label="닫기" variant="ghost" size="sm" disabled={mutation.isPending} onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card variant="outlined">
            <Stack gap="md">
              <TextField label="제목" required value={title} onChangeText={setTitle} maxLength={120} />
              <TextField label="내용" required value={content} onChangeText={setContent} multiline numberOfLines={9} maxLength={10000} />
              {canSetNotice ? (
                <Inline justify="space-between">
                  <View style={styles.copy}><AppText variant="bodyStrong">공지로 등록</AppText><AppText variant="caption">팀원 목록 상단에 공지 배지로 표시됩니다.</AppText></View>
                  <Switch value={isNotice} onValueChange={setIsNotice} trackColor={{ true: theme.colors.primarySoft }} thumbColor={isNotice ? theme.colors.primary : theme.colors.textMuted} />
                </Inline>
              ) : null}
              {!post ? (
                <Stack gap="sm">
                  <Inline justify="space-between"><View style={styles.copy}><AppText variant="label">첨부파일</AppText><AppText variant="caption">이미지·PDF, 최대 10개</AppText></View><Button label="파일 선택" variant="secondary" size="sm" onPress={() => void chooseFiles()} /></Inline>
                  {files.map((file, index) => <Inline key={`${file.uri}-${index}`} justify="space-between"><AppText style={styles.fileName} numberOfLines={1}>📎 {file.name}</AppText><Button label="제거" variant="ghost" size="sm" onPress={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} /></Inline>)}
                  {fileError ? <AppText color="danger">{fileError}</AppText> : null}
                </Stack>
              ) : <AppText variant="caption">기존 첨부파일은 수정 화면에서 변경되지 않습니다.</AppText>}
              {mutation.error ? <AppText color="danger">{mutation.error instanceof Error ? mutation.error.message : '게시글을 저장하지 못했습니다.'}</AppText> : null}
              <Button label={post ? '수정 완료' : '등록'} variant="actionEmphasis" fullWidth loading={mutation.isPending} disabled={!valid} onPress={() => mutation.mutate()} />
            </Stack>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: { minHeight: 64, paddingHorizontal: theme.spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.surface },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    copy: { flex: 1, gap: theme.spacing.xs },
    fileName: { flex: 1 },
  });
}
