import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
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
import { binderActionMessage } from './binderMessages';
import { BinderZoomSurface } from './BinderZoomSurface';
import { getPersonalBinder, sharePersonalBinderPdf } from './personalBinderApi';
import { binderSectionTitles, buildBinderViewerPages } from './personalBinderModel';
import { personalBinderQueryKeys } from './queryKeys';
import { useBinderPageImage } from './useBinderPageImage';

export function BinderViewerScreen({ binderId }: { binderId: string }) {
  const { token } = useAuth();
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { width, height } = useWindowDimensions();
  const query = useQuery({
    queryKey: personalBinderQueryKeys.detail(binderId),
    queryFn: () => getPersonalBinder(token, binderId),
    enabled: Boolean(token && binderId),
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
  const pages = useMemo(() => (binder ? buildBinderViewerPages(binder) : []), [binder]);
  const safeIndex = Math.min(index, Math.max(0, pages.length - 1));
  const current = pages[safeIndex];
  const pageWidth = pageSlot.width || width;
  const pageHeight = pageSlot.height || Math.max(280, height - (immersive ? 48 : 220));
  const uri = useBinderPageImage(
    token,
    current?.material.fileId ?? null,
    current?.material.id ?? '',
    current?.pdfPageNumber ?? 0,
    pageWidth,
  );

  if (query.isLoading) {
    return <View style={styles.root}><AppHeader title="상담 책자" showBack showMenu={false} /><LoadingState message="상담 책자를 준비하는 중…" /></View>;
  }
  if (!binder || pages.length === 0) {
    return (
      <View style={styles.root}>
        <AppHeader title={binder?.title || '상담 책자'} showBack showMenu={false} />
        {query.isError ? (
          <ErrorState title="바인더를 불러오지 못했습니다" message={binderActionMessage(query.error, '잠시 후 다시 시도해 주세요.')} onRetry={() => void query.refetch()} />
        ) : (
          <Stack gap="md" style={styles.controls}>
            <EmptyState title="상담할 페이지가 없습니다." message="편집에서 자료를 추가해 주세요." />
            <Button label="편집으로" onPress={() => router.push(`/customer-consulting/personal-binders/${binderId}/edit` as never)} />
          </Stack>
        )}
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
            key={current.key}
            uri={uri}
            pageLabel={`${safeIndex + 1} / ${pages.length}`}
            sectionTitle={current.sectionTitle}
            width={pageWidth}
            height={pageHeight}
            onSwipe={move}
            onToggleChrome={() => setImmersive((value) => !value)}
          />
        </View>
      </View>
      {immersive ? null : (
        <View style={styles.controls}>
          <Inline gap="sm" justify="space-between">
            <Button label="이전" size="sm" variant="secondary" disabled={safeIndex === 0} onPress={() => move(-1)} />
            <AppText variant="bodyStrong">{safeIndex + 1} / {pages.length}</AppText>
            <Button label="다음" size="sm" variant="secondary" disabled={safeIndex === pages.length - 1} onPress={() => move(1)} />
          </Inline>
          <AppText variant="caption" color="textMuted" align="center" numberOfLines={1}>{current.sectionTitle}</AppText>
          <Button
            label="전체 PDF"
            loading={exporting}
            onPress={() => {
              setExporting(true);
              setNotice('');
              void sharePersonalBinderPdf(token, binder.id, binder.title)
                .catch((error) => setNotice(binderActionMessage(error, '바인더 PDF를 만들지 못했습니다.')))
                .finally(() => setExporting(false));
            }}
          />
        </View>
      )}
      <ModalShell open={tocOpen} title="목차" presentation="dialog" onRequestClose={() => setTocOpen(false)} scroll>
        <Stack gap="sm">
          {binderSectionTitles(binder).map((section) => (
            <Button
              key={section.id}
              label={section.title}
              variant={section.id === current.sectionId ? 'primary' : 'secondary'}
              onPress={() => {
                const next = pages.findIndex((page) => page.sectionId === section.id);
                if (next >= 0) setIndex(next);
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
