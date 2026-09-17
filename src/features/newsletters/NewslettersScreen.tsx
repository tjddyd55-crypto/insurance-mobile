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
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { SearchControlRow } from '../../components/SearchControlRow';
import {
  AppText,
  Badge,
  Button,
  Card,
  Divider,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
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
import { formatPublishedAt, sortPublishedNews, stripUnsafeMarkup } from './newslettersModel';
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

  const items = sortPublishedNews(newsletters).filter(
    (row) =>
      (!insurer || row.insurerSlug === insurer) &&
      (!search.trim() ||
        `${row.title} ${row.summary} ${row.insurerName} ${row.boardLabel ?? ''}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );

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
        placeholder="제목 · 내용 · 게시처 검색"
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
            <NewsletterGridCard item={item} title={title} onPress={() => setSelected(item)} />
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
  title,
  onPress,
}: {
  item: NewsletterItem;
  title: string;
  onPress: () => void;
}) {
  const theme = useAppTheme();
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme, windowWidth), [theme, windowWidth]);
  const imageUrl = resolveNewsletterListCardImageUrl(item);
  const headline = stripUnsafeMarkup(item.summary) || stripUnsafeMarkup(item.title);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.gridCard}
      testID={`newsletter-card-${item.id}`}
    >
      <Card variant="outlined" padding="none" style={styles.gridCardInner}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.gridImage} resizeMode="cover" />
        ) : (
          <View style={[styles.gridImage, styles.gridImagePlaceholder]}>
            <AppText variant="caption" color="textSecondary" numberOfLines={4}>
              {headline}
            </AppText>
          </View>
        )}
        <Stack gap="xs" style={styles.gridMeta}>
          <AppText variant="caption" numberOfLines={1}>
            {item.insurerName || item.boardLabel || title}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2}>{headline}</AppText>
          <AppText variant="caption">{formatPublishedAt(item.publishedAt)}</AppText>
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
  const { width: windowWidth } = useWindowDimensions();
  const styles = useMemo(() => makeStyles(theme, windowWidth), [theme, windowWidth]);
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

  const headline =
    String(detail.data?.summary ?? item?.summary ?? detail.data?.title ?? item?.title ?? '').trim() ||
    '소식지';

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

  return (
    <Modal visible={Boolean(item)} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modal}>
        <View style={styles.modalHeader}>
          <AppText variant="heading">소식지 상세</AppText>
          <Button label="닫기" size="sm" variant="ghost" onPress={onClose} />
        </View>
        <ScrollView contentContainerStyle={styles.content}>
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
            <>
              <Card>
                <Stack gap="md">
                  <AppText variant="caption">
                    {detail.data.insurerName} · {formatPublishedAt(detail.data.publishedAt)}
                  </AppText>
                  <AppText variant="title">{headline}</AppText>
                  <Divider />
                  {galleryUrls.length ? (
                    <Stack gap="sm">
                      {galleryUrls.map((url) => (
                        <Pressable
                          key={url}
                          accessibilityRole="imagebutton"
                          onPress={() => void Linking.openURL(url)}
                        >
                          <Image
                            source={{ uri: url }}
                            style={styles.detailGalleryImage}
                            resizeMode="contain"
                          />
                        </Pressable>
                      ))}
                    </Stack>
                  ) : null}
                  <AppText>
                    {stripUnsafeMarkup(detail.data.bodyText || detail.data.summary)}
                  </AppText>
                  {detail.data.linkPreview?.url ? (
                    <Button
                      label={detail.data.linkPreview.title || '관련 링크 열기'}
                      variant="secondary"
                      onPress={() => void Linking.openURL(detail.data.linkPreview!.url)}
                    />
                  ) : null}
                </Stack>
              </Card>
              {fileAttachments.length ? <AppText variant="heading">첨부자료</AppText> : null}
              {fileAttachments.map((file: NewsletterAttachment) => (
                <Card key={file.id} variant="outlined">
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
                </Card>
              ))}
            </>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(theme: AppTheme, windowWidth: number) {
  const horizontalPadding = theme.spacing.lg;
  const cardWidth = (windowWidth - horizontalPadding * 2 - GRID_GAP) / GRID_COLUMNS;

  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
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
    searchRow: {
      width: '100%',
    },
    searchField: {
      flex: 1,
      minWidth: 0,
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
    gridImage: {
      width: '100%',
      aspectRatio: 3 / 4,
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
    detailGalleryImage: {
      width: '100%',
      minHeight: 220,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
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
