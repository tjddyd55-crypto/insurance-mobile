import { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';

import { AppText, Button, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { CustomerNewsImageCarousel } from './customerNewsImageCarousel';
import { buildCustomerNewsGalleryUrls } from './customerNewsContent';
import { isFileAttachment } from './customerNewsModel';
import { resolveCustomerNewsBodySegments } from './customerNewsContent';
import type { CustomerNewsPreviewDraft } from './types';

export type { CustomerNewsPreviewDraft } from './types';

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
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const contentWidth = Math.max(windowWidth - theme.spacing.lg * 2, 1);

  if (!draft) {
    return null;
  }

  const galleryUrls = buildCustomerNewsGalleryUrls({ attachments: draft.attachments });
  const files = draft.attachments
    .filter(isFileAttachment)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((row, index) => ({
      key: row.id ?? `${row.fileName}-${index}`,
      fileName: row.fileName,
    }));
  const content = draft.content.trim();
  const segments = resolveCustomerNewsBodySegments({
    galleryUrlCount: galleryUrls.length,
    content,
    fileCount: files.length,
  });

  return (
    <Modal visible={open} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <AppText variant="heading">고객 앱 미리보기</AppText>
          <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <Stack gap="md" style={styles.body}>
            {draft.isPinned ? (
              <AppText variant="caption" color="warning">상단 고정</AppText>
            ) : null}
            {segments.map((segment) => {
              if (segment === 'gallery') {
                return (
                  <CustomerNewsImageCarousel
                    key="gallery"
                    imageUrls={galleryUrls}
                    contentWidth={contentWidth}
                  />
                );
              }
              if (segment === 'content') {
                return <AppText key="content">{content}</AppText>;
              }
              return (
                <Stack key="files" gap="sm">
                  <AppText variant="label">첨부 파일</AppText>
                  {files.map((file) => (
                    <AppText key={file.key} variant="bodyStrong">{file.fileName}</AppText>
                  ))}
                </Stack>
              );
            })}
          </Stack>
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
    body: { width: '100%' },
  });
}
