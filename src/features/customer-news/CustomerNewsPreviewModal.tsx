import { useMemo } from 'react';
import { Image, Modal, ScrollView, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Divider, Stack, useAppTheme, type AppTheme } from '../../design-system';
import type { NewsAttachment } from './types';

export type CustomerNewsPreviewDraft = {
  title: string;
  content: string;
  attachments: NewsAttachment[];
  isPinned: boolean;
};

function imageAttachments(rows: NewsAttachment[]): NewsAttachment[] {
  return rows.filter((row) => row.kind === 'image' || String(row.mimeType ?? '').startsWith('image/'));
}

function fileAttachments(rows: NewsAttachment[]): NewsAttachment[] {
  return rows.filter((row) => row.kind === 'file' || row.mimeType === 'application/pdf');
}

export function CustomerNewsPreviewModal({
  open,
  draft,
  onClose,
}: {
  open: boolean;
  draft: CustomerNewsPreviewDraft | null;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (!draft) {
    return null;
  }

  const images = imageAttachments(draft.attachments);
  const files = fileAttachments(draft.attachments);

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <AppText variant="heading">고객 앱 미리보기</AppText>
          <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Card variant="outlined">
            <Stack gap="md">
              {draft.isPinned ? <AppText variant="caption" color="warning">상단 고정</AppText> : null}
              <AppText variant="title">{draft.title.trim() || '제목 없음'}</AppText>
              <AppText variant="caption">{new Date().toLocaleString('ko-KR')}</AppText>
              <Divider />
              {images.map((file, index) => (
                <Image
                  key={`${file.url}-${index}`}
                  source={{ uri: file.url }}
                  style={styles.image}
                  resizeMode="contain"
                />
              ))}
              <AppText>{draft.content.trim() || '본문이 없습니다.'}</AppText>
              {files.length ? (
                <Stack gap="sm">
                  <AppText variant="label">첨부 파일</AppText>
                  {files.map((file, index) => (
                    <AppText key={`${file.fileName}-${index}`} variant="bodyStrong">
                      {file.fileName}
                    </AppText>
                  ))}
                </Stack>
              ) : null}
            </Stack>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.huge },
    image: {
      width: '100%',
      minHeight: 220,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
    },
  });
}
