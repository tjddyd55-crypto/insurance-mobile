import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
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
  memoMatchesSearch,
  memoTimestamp,
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
            <Stack gap="md" style={styles.header}>
              <TextField
                accessibilityLabel="메모 검색"
                placeholder="메모 검색"
                value={search}
                onChangeText={setSearch}
                returnKeyType="search"
              />
              <Inline justify="space-between">
                <AppText variant="caption">{memos.length}개의 메모</AppText>
                <Button label="+ 메모 추가" size="sm" onPress={() => router.push('/memo/new')} />
              </Inline>
            </Stack>
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
                <Card variant="filled" style={styles.memoCard}>
                  <Stack gap="sm">
                    <AppText variant="caption" align="right">{formatMemoUpdatedAt(item.updatedAt ?? item.createdAt)}</AppText>
                    <AppText variant="subheading" numberOfLines={1}>{copy.title}</AppText>
                    <AppText color="textSecondary" numberOfLines={5}>{copy.preview || '내용 없음'}</AppText>
                  </Stack>
                </Card>
              </Pressable>
            );
          }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            query.isLoading ? (
              <LoadingState message="메모를 불러오는 중…" />
            ) : query.isError ? (
              <ErrorState
                title="메모를 불러오지 못했습니다"
                message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'}
                onRetry={() => void query.refetch()}
              />
            ) : (
              <View style={styles.empty}>
                <AppText variant="heading">{search ? '검색 결과가 없습니다' : '등록된 메모가 없습니다'}</AppText>
                <AppText color="textSecondary" align="center">새 메모를 작성해 업무 내용을 기록해 보세요.</AppText>
              </View>
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
    list: { flexGrow: 1, padding: theme.spacing.lg, paddingBottom: theme.spacing.xl },
    emptyList: { justifyContent: 'center' },
    header: { marginBottom: theme.spacing.md },
    memoCard: { backgroundColor: theme.colors.warningSoft },
    pressed: { opacity: theme.opacity.pressed },
    separator: { height: theme.spacing.md },
    empty: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.xl },
  });
}
