import { useEffect, useMemo, useState } from 'react';
import { PixelRatio, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useNavigation, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Inline,
  ModalShell,
  Stack,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import {
  binderActionMessage,
  BINDER_API_UNAVAILABLE_MESSAGE,
  BINDER_API_UNAVAILABLE_TITLE,
  isBinderApiUnavailable,
  SHARED_VIEWER_COPY,
  sharedViewerErrorMessage,
} from './binderMessages';
import { BinderThumbnailStrip } from './BinderThumbnailStrip';
import { BinderZoomSurface } from './BinderZoomSurface';
import {
  binderSectionJumps,
  fetchViewerPages,
  fullPageImageWidth,
  pageImageRequestKey,
  prefetchViewerPageLinks,
  viewerPageRequest,
  type BinderViewerSource,
} from './binderPageImage';
import { sharePersonalBinderPdf } from './personalBinderApi';
import { personalBinderQueryKeys } from './queryKeys';
import { usePageImageLink } from './usePageImageLink';

/**
 * 상담 책자 뷰어(내 바인더 / 공유 바인더 직접 보기 공용).
 * 공유 출처일 때는 읽기 전용: 편집·전체 PDF 내보내기 버튼을 두지 않는다.
 */
export function BinderViewerScreen({ binderId = '', shareId = '' }: { binderId?: string; shareId?: string }) {
  const isShared = Boolean(shareId);
  const source = useMemo<BinderViewerSource>(
    () => (shareId ? { kind: 'shared', shareId } : { kind: 'binder', binderId }),
    [binderId, shareId],
  );
  const { token } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const query = useQuery({
    queryKey: isShared ? personalBinderQueryKeys.sharedPages(shareId) : personalBinderQueryKeys.pages(binderId),
    queryFn: () => fetchViewerPages(token, source),
    enabled: Boolean(token && (isShared ? /^\d+$/.test(shareId) : binderId)),
  });
  const [index, setIndex] = useState(0);
  const [tocOpen, setTocOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const [notice, setNotice] = useState('');
  const [exporting, setExporting] = useState(false);
  const [pageSlot, setPageSlot] = useState({ width: 0, height: 0 });

  useEffect(() => {
    setDrawerSwipe(navigation, false);
    return () => setDrawerSwipe(navigation, true);
  }, [navigation]);

  const binder = query.data;
  const pages = useMemo(() => binder?.pages ?? [], [binder]);
  const safeIndex = Math.min(index, Math.max(0, pages.length - 1));
  const current = pages[safeIndex];
  const pageWidth = pageSlot.width || width;
  const pageHeight = pageSlot.height || Math.max(280, height - (immersive ? 48 : 220));
  const fullWidth = fullPageImageWidth(Math.round(width * PixelRatio.get()));
  const imageRequest = useMemo(
    () => (current ? viewerPageRequest(source, current.index, fullWidth) : null),
    [source, current, fullWidth],
  );
  const { uri, refresh } = usePageImageLink(token, imageRequest);
  const sectionJumps = useMemo(() => binderSectionJumps(pages), [pages]);

  useEffect(() => {
    if (!token || !current) return;
    const neighbors = [current.index - 1, current.index + 1, current.index + 2].filter((pageIndex) =>
      pages.some((page) => page.index === pageIndex),
    );
    void prefetchViewerPageLinks(token, source, neighbors, fullWidth);
  }, [source, current, fullWidth, pages, token]);

  if (isShared && !/^\d+$/.test(shareId)) {
    return (
      <View style={styles.root}>
        <AppHeader title="공유 바인더" showBack showMenu={false} />
        <ErrorState title={SHARED_VIEWER_COPY.errorTitle} message="잘못된 공유 바인더 주소입니다." />
      </View>
    );
  }
  if (query.isLoading) {
    return <View style={styles.root}><AppHeader title="상담 책자" showBack showMenu={false} /><LoadingState message="상담 책자를 준비하는 중…" /></View>;
  }
  if (isShared && (query.isError || !binder)) {
    return (
      <View style={styles.root}>
        <AppHeader title="공유 바인더" showBack showMenu={false} />
        <ErrorState title={SHARED_VIEWER_COPY.errorTitle} message={sharedViewerErrorMessage(query.error)} onRetry={() => void query.refetch()} />
      </View>
    );
  }
  if (isBinderApiUnavailable(query.error)) {
    return (
      <View style={styles.root}>
        <AppHeader title="상담 책자" showBack showMenu={false} />
        <ErrorState title={BINDER_API_UNAVAILABLE_TITLE} message={BINDER_API_UNAVAILABLE_MESSAGE} onRetry={() => void query.refetch()} />
      </View>
    );
  }
  if (query.isError || !binder) {
    return (
      <View style={styles.root}>
        <AppHeader title="상담 책자" showBack showMenu={false} />
        <ErrorState title="바인더를 불러오지 못했습니다" message={binderActionMessage(query.error, '잠시 후 다시 시도해 주세요.')} onRetry={() => void query.refetch()} />
      </View>
    );
  }
  if (pages.length === 0 || !current) {
    return (
      <View style={styles.root}>
        <AppHeader title={binder.title || '상담 책자'} showBack showMenu={false} />
        <Stack gap="md" style={styles.controls}>
          {isShared ? (
            <EmptyState title={SHARED_VIEWER_COPY.emptyTitle} message={SHARED_VIEWER_COPY.emptyMessage} />
          ) : (
            <>
              <EmptyState title="상담할 페이지가 없습니다." message="편집에서 자료를 추가해 주세요." />
              <Button label="편집으로" onPress={() => router.push(`/customer-consulting/personal-binders/${binderId}/edit` as never)} />
            </>
          )}
        </Stack>
      </View>
    );
  }

  const move = (direction: -1 | 1) => {
    setIndex((value) => Math.min(pages.length - 1, Math.max(0, value + direction)));
  };

  return (
    <View style={[styles.root, immersive && styles.immersive]}>
      {immersive ? null : (
        <AppHeader
          title={binder.title}
          subtitle={current.sectionTitle}
          showBack
          showMenu={false}
          showBillingStatus={false}
          rightAction={<Button label="목차" size="sm" variant="action" onPress={() => setTocOpen(true)} />}
        />
      )}
      <View style={styles.stage}>
        {notice ? <AppText color="danger" align="center" style={styles.notice}>{notice}</AppText> : null}
        <View
          style={styles.pageSlot}
          onLayout={(event) => {
            const next = event.nativeEvent.layout;
            setPageSlot((currentSlot) => (
              currentSlot.width === next.width && currentSlot.height === next.height
                ? currentSlot
                : { width: next.width, height: next.height }
            ));
          }}
        >
          <BinderZoomSurface
            uri={uri}
            pageKey={imageRequest ? pageImageRequestKey(imageRequest) : ''}
            pageLabel={`${safeIndex + 1} / ${pages.length}`}
            sectionTitle={current.sectionTitle}
            width={pageWidth}
            height={pageHeight}
            onSwipe={move}
            onToggleChrome={() => setImmersive((value) => !value)}
            onImageError={refresh}
          />
        </View>
      </View>
      {immersive ? null : (
        <View style={styles.controls}>
          <BinderThumbnailStrip
            token={token}
            source={source}
            pages={pages}
            selectedPosition={safeIndex}
            onSelect={setIndex}
          />
          <Inline gap="sm" justify="space-between">
            <Button label="이전" size="sm" variant="secondary" disabled={safeIndex === 0} onPress={() => move(-1)} />
            <AppText variant="bodyStrong">{safeIndex + 1} / {pages.length}</AppText>
            <Button label="다음" size="sm" variant="secondary" disabled={safeIndex === pages.length - 1} onPress={() => move(1)} />
          </Inline>
          <AppText variant="caption" color="textMuted" align="center" numberOfLines={1}>{current.sectionTitle}</AppText>
          {isShared ? null : <Button
            label="전체 PDF"
            loading={exporting}
            onPress={() => {
              setExporting(true);
              setNotice('');
              void sharePersonalBinderPdf(token, binder.binderId || binderId, binder.title)
                .catch((error) => setNotice(binderActionMessage(error, '바인더 PDF를 만들지 못했습니다.')))
                .finally(() => setExporting(false));
            }}
          />}
        </View>
      )}
      <ModalShell open={tocOpen} title="목차" presentation="dialog" onRequestClose={() => setTocOpen(false)} scroll>
        <Stack gap="sm">
          {sectionJumps.map((section) => (
            <Button
              key={section.sectionId}
              label={section.title}
              variant={section.position === safeIndex || pages[safeIndex]?.sectionId === section.sectionId ? 'primary' : 'secondary'}
              onPress={() => {
                setIndex(section.position);
                setTocOpen(false);
              }}
            />
          ))}
        </Stack>
      </ModalShell>
    </View>
  );
}

function setDrawerSwipe(navigation: unknown, enabled: boolean): void {
  let current: unknown = navigation;
  while (isNavigator(current)) {
    const state = current.getState?.();
    if (state?.type === 'drawer') {
      current.setOptions?.({ swipeEnabled: enabled });
      return;
    }
    current = current.getParent?.();
  }
}

function isNavigator(value: unknown): value is {
  getState?: () => { type?: string } | undefined;
  setOptions?: (options: { swipeEnabled: boolean }) => void;
  getParent?: () => unknown;
} {
  return typeof value === 'object' && value != null;
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    immersive: { backgroundColor: '#111111' },
    stage: { flex: 1, width: '100%' },
    pageSlot: { flex: 1, width: '100%', overflow: 'hidden' },
    notice: { paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.sm },
    controls: {
      paddingHorizontal: theme.layout.screenPaddingHorizontal,
      paddingBottom: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
  });
}
