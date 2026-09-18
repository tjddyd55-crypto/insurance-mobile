import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { ModalCloseButton } from '../../components/ModalCloseButton';
import { NewsDetailImageViewerModal } from '../../components/NewsDetailImageViewerModal';
import { NewsDetailPageZoomContent } from '../../components/NewsDetailPageZoomContent';
import { SearchControlRow } from '../../components/SearchControlRow';
import {
  AppText,
  Badge,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  useAppTheme,
  useBottomSafeInset,
  type AppTheme,
} from '../../design-system';
import {
  getBoardNewsletter,
  getBoardNewsletterFeed,
  getNewsletter,
  getNewsletterFeed,
} from './newslettersApi';
import {
  buildNewsletterGalleryUrls,
  isNewsletterImageAttachment,
  resolveNewsletterAttachmentDisplayUrl,
  resolveNewsletterListCardImageUrl,
} from './newslettersImageUtils';
import { NEWSLETTER_IMAGE_ASPECT_RATIO } from './newsletterImageLayout';
import { sortPublishedNews } from './newslettersModel';
import { formatInsurerNewsDateLabel, formatInsurerNewsDateTime } from './utils/formatInsurerNewsDate';
import {
  newsletterDetailBodyText,
  newsletterDetailSegmentOrder,
  newsletterListPreviewText,
  resolveNewsletterAuthorLabel,
} from './utils/insurerNewsPresentation';
import type { NewsChannel, NewsletterAttachment, NewsletterDetail, NewsletterItem } from './types';

export type NewslettersScreenProps =
  | { mode?: 'channel'; channel: NewsChannel; boardSlug?: never; initialNewsletterId?: string }
  | { mode: 'board'; boardSlug: string; channel?: never; initialNewsletterId?: string };

const GRID_COLUMNS = 2;
const GRID_GAP = 12;

export function NewslettersScreen(props: NewslettersScreenProps) {
  const isBoard = props.mode === 'board';
  const channel = isBoard ? null : props.channel;
  const boardSlug = isBoard ? props.boardSlug.trim() : '';
  const { token, user } = useAuth();
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme, windowWidth), [theme, windowWidth]);
  const [searchDraft, setSearchDraft] = useState('');
  const [search, setSearch] = useState('');
  const [insurer, setInsurer] = useState('');
  const [selected, setSelected] = useState<NewsletterItem | null>(null);
  const initialNewsletterId = String(props.initialNewsletterId ?? '').trim();

  const channelQuery = useQuery({
    queryKey: ['newsletters', channel, user?.gaCode],
    queryFn: () => getNewsletterFeed(token, user?.gaCode ?? '', channel!),
    enabled: Boolean(!isBoard && token && user?.gaCode && channel),
  });
  const boardQuery = useQuery({
    queryKey: ['newsletters', 'board', boardSlug],
    queryFn: () => getBoardNewsletterFeed(token, boardSlug),
    enabled: Boolean(isBoard && token && boardSlug),
  });

  const query = isBoard ? boardQuery : channelQuery;
  const newsletters = isBoard
    ? boardQuery.data?.newsletters ?? []
    : channelQuery.data?.newsletters ?? [];
  const insurers = isBoard ? [] : channelQuery.data?.insurers ?? [];
  const boardTitle = boardQuery.data?.board.label?.trim() || boardSlug || '소식지';
  const title = isBoard
    ? boardTitle
    : channel === 'INSURER'
      ? '원수사소식지'
      : '손해사정사 소식지';

  const items = sortPublishedNews(newsletters).filter((row) => {
    if (insurer && row.insurerSlug !== insurer) {
      return false;
    }
    if (!search.trim()) {
      return true;
    }
    const haystack = [
      resolveNewsletterAuthorLabel(row),
      newsletterListPreviewText(row),
      row.boardLabel ?? '',
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(search.trim().toLowerCase());
  });

  const applySearch = useCallback(() => {
    setSearch(searchDraft.trim());
  }, [searchDraft]);

  useEffect(() => {
    if (!initialNewsletterId || selected?.id === initialNewsletterId) return;
    const matched = items.find((row) => row.id === initialNewsletterId);
    if (matched) {
      setSelected(matched);
    }
  }, [initialNewsletterId, items, selected?.id]);

  const listHeader = (
    <Stack gap="md" style={styles.listHeader}>
      <SearchControlRow
        placeholder="내용 · 게시처 검색"
        value={searchDraft}
        onChangeText={setSearchDraft}
        onSubmit={applySearch}
      />
      {!isBoard ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          <Button
            label="전체"
            size="sm"
            variant={!insurer ? 'selected' : 'secondary'}
            onPress={() => setInsurer('')}
          />
          {insurers.map((row) => (
            <Button
              key={row.insurerSlug}
              label={`${row.insurerName} ${row.newsletterCount}`}
              size="sm"
              variant={insurer === row.insurerSlug ? 'selected' : 'secondary'}
              onPress={() => setInsurer(row.insurerSlug)}
            />
          ))}
        </ScrollView>
      ) : null}
      {query.isLoading ? <LoadingState message="소식지를 불러오는 중…" /> : null}
      {query.isError ? (
        <ErrorState
          title={isBoard ? '게시판을 불러오지 못했습니다' : '소식지를 불러오지 못했습니다'}
          message={
            query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'
          }
          onRetry={() => void query.refetch()}
        />
      ) : null}
      <Inline wrap>
        <Badge label={`${items.length}건`} tone="info" />
        {user?.gaName ? <Badge label={user.gaName} /> : null}
      </Inline>
      {!query.isLoading && !query.isError && !items.length ? (
        <Card variant="outlined">
          <AppText color="textSecondary" align="center">
            {isBoard ? '이 게시판에 등록된 소식지가 없습니다.' : '등록된 소식지가 없습니다.'}
          </AppText>
        </Card>
      ) : null}
    </Stack>
  );

  return (
    <View style={styles.root}>
      <AppHeader title={title} />
      <Screen padded={false}>
        <FlatList
          data={items}
          key={GRID_COLUMNS}
          numColumns={GRID_COLUMNS}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.content}
          columnWrapperStyle={styles.gridRow}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          renderItem={({ item }) => (
            <NewsletterGridCard item={item} onPress={() => setSelected(item)} />
          )}
        />
      </Screen>
      <NewsletterDetailModal
        item={selected}
        token={token}
        gaCode={user?.gaCode ?? ''}
        channel={channel}
        boardSlug={isBoard ? boardSlug : null}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

function NewsletterGridCard({
  item,
  onPress,
}: {
  item: NewsletterItem;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme, windowWidth), [theme, windowWidth]);
  const imageUrl = resolveNewsletterListCardImageUrl(item);
  const placeholderText = newsletterListPreviewText(item);
  const publisher = resolveNewsletterAuthorLabel(item);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${publisher} 소식지`}
      onPress={onPress}
      style={styles.gridCard}
      testID={`newsletter-card-${item.id}`}
    >
      <Card variant="outlined" padding="none" style={styles.gridCardInner}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.newsletterImageFrame}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.newsletterImageFrame, styles.gridImagePlaceholder]}>
            {placeholderText ? (
              <AppText variant="caption" color="textSecondary" numberOfLines={4}>
                {placeholderText}
              </AppText>
            ) : null}
          </View>
        )}
        <Stack gap="xs" style={styles.gridMeta}>
          <AppText variant="caption" numberOfLines={1}>
            {publisher}
          </AppText>
          <AppText variant="caption" color="textSecondary">
            {formatInsurerNewsDateLabel(item.publishedAt)}
          </AppText>
        </Stack>
      </Card>
    </Pressable>
  );
}

function NewsletterDetailModal({
  item,
  token,
  gaCode,
  channel,
  boardSlug,
  onClose,
}: {
  item: NewsletterItem | null;
  token: string | null;
  gaCode: string;
  channel: NewsChannel | null;
  boardSlug: string | null;
  onClose: () => void;
}) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomSafeInset();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme, windowWidth), [theme, windowWidth]);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  useEffect(() => {
    setZoomImageUrl(null);
  }, [item?.id]);
  const detail = useQuery({
    queryKey: ['newsletter', channel, boardSlug, gaCode, item?.id],
    queryFn: () =>
      boardSlug
        ? getBoardNewsletter(token, boardSlug, item!.id)
        : getNewsletter(token, gaCode, channel!, item!.id),
    enabled: Boolean(token && item && (boardSlug || (gaCode && channel))),
    placeholderData: item
      ? ({
          ...item,
          bodyText: item.summary,
          attachments: [],
          linkPreview: null,
        } satisfies NewsletterDetail)
      : undefined,
  });

  const galleryUrls = detail.data
    ? buildNewsletterGalleryUrls({
        heroImageUrl: detail.data.heroImageUrl,
        heroImageObjectKey: detail.data.heroImageObjectKey,
        attachments: detail.data.attachments,
      })
    : [];
  const fileAttachments = (detail.data?.attachments ?? []).filter(
    (file) => !isNewsletterImageAttachment(file),
  );

  const publisher = detail.data
    ? resolveNewsletterAuthorLabel(detail.data)
    : item
      ? resolveNewsletterAuthorLabel(item)
      : '—';
  const bodyText = detail.data ? newsletterDetailBodyText(detail.data) : '';
  const detailSegments = detail.data
    ? newsletterDetailSegmentOrder({
        bodyText,
        galleryUrlCount: galleryUrls.length,
        fileCount: fileAttachments.length,
      })
    : [];

  return (
    <Modal visible={Boolean(item)} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.modal, { paddingTop: insets.top }]}>
        <View style={styles.modalHeader}>
          <AppText variant="heading">소식지 상세</AppText>
          <ModalCloseButton onPress={onClose} />
        </View>
        <GestureHandlerRootView style={styles.detailGestureRoot}>
          <ScrollView
            contentContainerStyle={[
              styles.content,
              styles.detailContent,
              { paddingBottom: bottomInset + theme.spacing.lg },
            ]}
          >
          {detail.isError ? (
            <ErrorState
              title="상세를 불러오지 못했습니다"
              message={
                detail.error instanceof Error
                  ? detail.error.message
                  : '잠시 후 다시 시도해 주세요.'
              }
              onRetry={() => void detail.refetch()}
            />
          ) : null}
          {detail.isPending && !detail.data ? (
            <LoadingState message="상세를 불러오는 중…" />
          ) : null}
          {detail.data ? (
            <NewsDetailPageZoomContent resetKey={item?.id ?? null}>
              <Stack gap="md" style={styles.detailBody}>
                <AppText variant="caption">
                  {publisher} · {formatInsurerNewsDateTime(detail.data.publishedAt)}
                </AppText>
                {detailSegments.map((segment) => {
                if (segment === 'body') {
                  return (
                    <Stack key="body" gap="md">
                      <AppText>{bodyText}</AppText>
                      {detail.data.linkPreview?.url ? (
                        <Button
                          label={detail.data.linkPreview.title || '관련 링크 열기'}
                          variant="secondary"
                          onPress={() => void Linking.openURL(detail.data.linkPreview!.url)}
                        />
                      ) : null}
                    </Stack>
                  );
                }
                if (segment === 'gallery') {
                  return (
                    <Stack key="gallery" gap="sm">
                      {galleryUrls.map((url) => (
                        <Pressable
                          key={url}
                          accessibilityRole="button"
                          accessibilityLabel="이미지 확대"
                          onPress={() => setZoomImageUrl(url)}
                          style={styles.detailGalleryFrame}
                        >
                          <Image
                            source={{ uri: url }}
                            style={styles.detailGalleryImage}
                            resizeMode="cover"
                          />
                        </Pressable>
                      ))}
                    </Stack>
                  );
                }
                return (
                  <Stack key="files" gap="sm" style={styles.attachmentSection}>
                    <AppText variant="heading">첨부자료</AppText>
                    {fileAttachments.map((file: NewsletterAttachment) => (
                      <View key={file.id} style={styles.detailAttachmentRow}>
                        <Inline justify="space-between">
                          <View style={styles.grow}>
                            <AppText variant="bodyStrong">{file.fileName}</AppText>
                            <AppText variant="caption">
                              파일
                              {file.size ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
                            </AppText>
                          </View>
                          <Button
                            label="열기"
                            size="sm"
                            variant="secondary"
                            onPress={() =>
                              void Linking.openURL(resolveNewsletterAttachmentDisplayUrl(file))
                            }
                          />
                        </Inline>
                      </View>
                    ))}
                  </Stack>
                );
                })}
              </Stack>
            </NewsDetailPageZoomContent>
          ) : null}
          </ScrollView>
        </GestureHandlerRootView>
        <NewsDetailImageViewerModal
          visible={Boolean(zoomImageUrl)}
          imageUrl={zoomImageUrl}
          onClose={() => setZoomImageUrl(null)}
        />
      </View>
    </Modal>
  );
}

function makeStyles(theme: AppTheme, windowWidth: number) {
  const horizontalPadding = theme.spacing.lg;
  const cardWidth = (windowWidth - horizontalPadding * 2 - GRID_GAP) / GRID_COLUMNS;
  const detailGalleryWidth = windowWidth - horizontalPadding * 2;
  const detailGalleryHeight = detailGalleryWidth / NEWSLETTER_IMAGE_ASPECT_RATIO;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    detailGestureRoot: { flex: 1 },
    grow: { flex: 1 },
    content: {
      paddingHorizontal: horizontalPadding,
      paddingBottom: theme.spacing.huge,
      gap: theme.spacing.md,
    },
    listHeader: {
      paddingTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    filters: { gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
    gridRow: {
      gap: GRID_GAP,
      marginBottom: GRID_GAP,
    },
    gridCard: {
      width: cardWidth,
    },
    gridCardInner: {
      overflow: 'hidden',
    },
    newsletterImageFrame: {
      width: '100%',
      aspectRatio: NEWSLETTER_IMAGE_ASPECT_RATIO,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    gridImagePlaceholder: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.sm,
    },
    gridMeta: {
      padding: theme.spacing.sm,
    },
    detailContent: {
      paddingTop: theme.spacing.md,
    },
    detailBody: {
      width: '100%',
    },
    detailGalleryFrame: {
      width: '100%',
      height: detailGalleryHeight,
      borderRadius: theme.radius.md,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceSubtle,
    },
    detailGalleryImage: {
      ...StyleSheet.absoluteFill,
    },
    attachmentSection: {
      width: '100%',
      paddingTop: theme.spacing.sm,
    },
    detailAttachmentRow: {
      width: '100%',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    modal: { flex: 1, backgroundColor: theme.colors.background },
    modalHeader: {
      minHeight: 64,
      paddingHorizontal: theme.spacing.lg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
  });
}
