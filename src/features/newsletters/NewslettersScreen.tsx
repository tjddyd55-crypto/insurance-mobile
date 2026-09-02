import { useMemo, useState } from 'react';
import {
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
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
import { formatPublishedAt, sortPublishedNews, stripUnsafeMarkup } from './newslettersModel';
import type { NewsChannel, NewsletterItem } from './types';

export type NewslettersScreenProps =
  | { mode?: 'channel'; channel: NewsChannel; boardSlug?: never }
  | { mode: 'board'; boardSlug: string; channel?: never };

export function NewslettersScreen(props: NewslettersScreenProps) {
  const isBoard = props.mode === 'board';
  const channel = isBoard ? null : props.channel;
  const boardSlug = isBoard ? props.boardSlug.trim() : '';
  const { token, user } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const [search, setSearch] = useState('');
  const [insurer, setInsurer] = useState('');
  const [selected, setSelected] = useState<NewsletterItem | null>(null);

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
  const caption = isBoard
    ? '선택한 게시판의 소식을 확인합니다.'
    : channel === 'INSURER'
      ? '보험사별 최신 업무 소식과 첨부자료를 확인합니다.'
      : '손해사정 관련 공지와 업무자료를 확인합니다.';

  const items = sortPublishedNews(newsletters).filter(
    (row) =>
      (!insurer || row.insurerSlug === insurer) &&
      (!search.trim() ||
        `${row.title} ${row.summary} ${row.insurerName} ${row.boardLabel ?? ''}`
          .toLowerCase()
          .includes(search.trim().toLowerCase())),
  );

  return (
    <View style={styles.root}>
      <AppHeader title={title} />
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
          <Card>
            <Stack gap="md">
              <AppText variant="heading">{title}</AppText>
              <AppText variant="caption">{caption}</AppText>
              <TextField
                placeholder="제목 · 내용 · 게시처 검색"
                value={search}
                onChangeText={setSearch}
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
            </Stack>
          </Card>
          {query.isLoading ? <LoadingState message="소식지를 불러오는 중…" /> : null}
          {query.isError ? (
            <ErrorState
              title={isBoard ? '게시판을 불러오지 못했습니다' : '소식지를 불러오지 못했습니다'}
              message={
                query.error instanceof Error
                  ? query.error.message
                  : '잠시 후 다시 시도해 주세요.'
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
                {isBoard
                  ? '이 게시판에 등록된 소식지가 없습니다.'
                  : '등록된 소식지가 없습니다.'}
              </AppText>
            </Card>
          ) : null}
          {items.map((item) => (
            <Card key={item.id} variant="outlined">
              <Stack gap="sm">
                {item.heroImageUrl ? (
                  <Image
                    source={{ uri: item.heroImageUrl }}
                    style={styles.hero}
                    resizeMode="cover"
                  />
                ) : null}
                <Inline justify="space-between" align="flex-start">
                  <View style={styles.grow}>
                    <AppText variant="caption">
                      {item.insurerName || item.boardLabel || title}
                    </AppText>
                    <AppText variant="bodyStrong">{item.title}</AppText>
                  </View>
                  <AppText variant="caption">
                    {formatPublishedAt(item.publishedAt)}
                  </AppText>
                </Inline>
                {item.summary ? (
                  <AppText numberOfLines={3}>{stripUnsafeMarkup(item.summary)}</AppText>
                ) : null}
                <Inline wrap>
                  {item.hasImages ? <Badge label="이미지" tone="info" /> : null}
                  {item.hasPdf ? <Badge label="PDF" tone="warning" /> : null}
                  <Button label="자세히" size="sm" onPress={() => setSelected(item)} />
                </Inline>
              </Stack>
            </Card>
          ))}
        </ScrollView>
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
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const detail = useQuery({
    queryKey: ['newsletter', channel, boardSlug, item?.id],
    queryFn: () =>
      boardSlug
        ? getBoardNewsletter(token, boardSlug, item!.id)
        : getNewsletter(token, gaCode, channel!, item!.id),
    enabled: Boolean(token && item && (boardSlug || (gaCode && channel))),
  });

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
          {detail.data ? (
            <>
              <Card>
                <Stack gap="md">
                  <AppText variant="caption">
                    {detail.data.insurerName} · {formatPublishedAt(detail.data.publishedAt)}
                  </AppText>
                  <AppText variant="title">{detail.data.title}</AppText>
                  <Divider />
                  {detail.data.heroImageUrl ? (
                    <Image
                      source={{ uri: detail.data.heroImageUrl }}
                      style={styles.detailHero}
                      resizeMode="contain"
                    />
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
              {detail.data.attachments.length ? (
                <AppText variant="heading">첨부자료</AppText>
              ) : null}
              {detail.data.attachments.map((file) => (
                <Card key={file.id} variant="outlined">
                  <Inline justify="space-between">
                    <View style={styles.grow}>
                      <AppText variant="bodyStrong">{file.fileName}</AppText>
                      <AppText variant="caption">
                        {file.kind === 'image' ? '이미지' : '파일'}
                        {file.size ? ` · ${(file.size / 1024 / 1024).toFixed(1)} MB` : ''}
                      </AppText>
                    </View>
                    <Button
                      label="열기"
                      size="sm"
                      variant="secondary"
                      onPress={() => void Linking.openURL(file.url)}
                    />
                  </Inline>
                </Card>
              ))}
            </>
          ) : (
            <AppText align="center">상세를 불러오는 중…</AppText>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function makeStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    grow: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.huge,
      gap: theme.spacing.md,
    },
    filters: { gap: theme.spacing.sm, paddingVertical: theme.spacing.xs },
    hero: {
      width: '100%',
      height: 160,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    detailHero: {
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
