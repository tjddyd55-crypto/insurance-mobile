import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import {
  formatMemoUpdatedAt,
  memoListEmptyCopy,
  memoMatchesSearch,
  memoTimestamp,
  MEMO_LIST_PREVIEW_LINES,
  parseMemoContent,
} from './memoModel';
import { listMemos } from './memosApi';
import { memoQueryKeys } from './queryKeys';
import type { MemoRecord } from './types';

export function MemosScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [search, setSearch] = useState('');
  const query = useQuery({
    queryKey: memoQueryKeys.all,
    queryFn: () => listMemos(token),
    enabled: Boolean(token),
  });
  const memos = useMemo(
    () => [...(query.data ?? [])]
      .filter((memo) => memoMatchesSearch(memo, search))
      .sort((a, b) => memoTimestamp(b) - memoTimestamp(a)),
    [query.data, search],
  );
  const emptyCopy = memoListEmptyCopy(search);

  return (
    <View style={styles.root}>
      <AppHeader title="스티커 메모" />
      <Screen padded={false}>
        <FlatList
          data={memos}
          keyExtractor={(memo) => memo.id}
          contentContainerStyle={[styles.list, !memos.length && styles.emptyList]}
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          ListHeaderComponent={
            <Inline gap="sm" style={styles.header}>
              <TextField
                accessibilityLabel="메모 검색"
                placeholder="검색..."
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
                containerStyle={styles.search}
              />
              <Button label="+ 메모 추가" size="sm" onPress={() => router.push('/memo/new')} />
            </Inline>
          }
          renderItem={({ item }: { item: MemoRecord }) => {
            const copy = parseMemoContent(item.content);
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${copy.title} 메모 편집`}
                onPress={() => router.push({ pathname: '/memo/[memoId]/edit', params: { memoId: item.id } })}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <Card variant="filled" padding="md" style={styles.memoCard}>
                  <Stack gap="xs">
                    <Inline justify="space-between" align="flex-start">
                      <AppText variant="bodyStrong" numberOfLines={1} style={styles.memoTitle}>
                        {copy.title}
                      </AppText>
                      <AppText variant="caption" color="textMuted">
                        {formatMemoUpdatedAt(item.updatedAt ?? item.createdAt)}
                      </AppText>
                    </Inline>
                    <AppText color="textSecondary" numberOfLines={MEMO_LIST_PREVIEW_LINES}>
                      {copy.preview || '내용 없음'}
                    </AppText>
                  </Stack>
                </Card>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingState compact message="메모를 불러오는 중…" />
            ) : query.isError ? (
              <ErrorState
                compact
                title="메모를 불러오지 못했습니다"
                message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <EmptyState compact title={emptyCopy.title} />
            )
          }
        />
      </Screen>
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    list: {
      flexGrow: 1,
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingTop: theme.layout.screenPaddingTop,
      paddingBottom: theme.layout.contentBottomInset,
    },
    emptyList: { flexGrow: 1 },
    header: { marginBottom: theme.spacing.md, alignItems: 'center' },
    search: { flex: 1, minWidth: 0 },
    memoCard: { backgroundColor: theme.colors.warningSoft },
    memoTitle: { flex: 1, minWidth: 0, paddingRight: theme.spacing.sm },
    pressed: { opacity: theme.opacity.pressed },
    separator: { height: theme.layout.compactListGap },
  });
}
