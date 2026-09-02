import { useMemo, useState } from 'react';
import { Image, Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { AppText, Button, Card, Inline, Screen, Stack, useAppTheme, type AppTheme } from '../../design-system';
import { getInsurerSites } from './insurerSitesApi';
import { insurerInitials, insurerLogoUrl, safeExternalUrl } from './insurerSitesModel';
import type { InsurerSiteCategory } from './types';

export function InsurerSitesScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [category, setCategory] = useState<InsurerSiteCategory>('non_life');
  const query = useQuery({ queryKey: ['insurer-sites', category], queryFn: () => getInsurerSites(token, category), enabled: Boolean(token) });

  return (
    <View style={styles.root}>
      <AppHeader title="설계사이트" />
      <Screen padded={false}>
        <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} colors={[theme.colors.primary]} tintColor={theme.colors.primary} />}>
          <Stack gap="xs"><AppText variant="heading">보험사 설계사이트</AppText><AppText variant="caption">보험사별 설계사이트, 공식 홈페이지와 공시실로 이동합니다.</AppText></Stack>
          <Inline><Button label="손해보험사" variant={category === 'non_life' ? 'selected' : 'secondary'} onPress={() => setCategory('non_life')} style={styles.tab} /><Button label="생명보험사" variant={category === 'life' ? 'selected' : 'secondary'} onPress={() => setCategory('life')} style={styles.tab} /></Inline>
          {query.isError ? <ErrorState title="보험사 목록을 불러오지 못했습니다" message={query.error instanceof Error ? query.error.message : '잠시 후 다시 시도해 주세요.'} onRetry={() => void query.refetch()} /> : null}
          {!query.isLoading && !query.isError && !query.data?.length ? <Card variant="outlined"><AppText color="textSecondary" align="center">표시할 보험사가 없습니다.</AppText></Card> : null}
          {(query.data ?? []).map((site) => <InsurerSiteCard key={site.id} site={site} styles={styles} />)}
          <Card variant="filled"><Stack gap="sm"><AppText variant="bodyStrong">안내사항</AppText><AppText color="textSecondary">연결되지 않은 메뉴는 비활성 상태로 표시됩니다. 링크는 기기의 기본 브라우저에서 안전하게 열립니다.</AppText></Stack></Card>
        </ScrollView>
      </Screen>
    </View>
  );
}

function InsurerSiteCard({ site, styles }: { site: Awaited<ReturnType<typeof getInsurerSites>>[number]; styles: ReturnType<typeof createStyles> }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const logo = insurerLogoUrl(site.logoPath);
  async function open(raw: string) { const url = safeExternalUrl(raw); if (url) await Linking.openURL(url); }
  return (
    <Card variant="outlined">
      <Stack gap="md">
        <View style={styles.logoBox}>{logo && !logoFailed ? <Image source={{ uri: logo }} resizeMode="contain" style={styles.logo} onError={() => setLogoFailed(true)} accessibilityLabel={`${site.name} 로고`} /> : <AppText variant="title" color="textSecondary">{insurerInitials(site.name)}</AppText>}</View>
        <AppText variant="heading" align="center">{site.name}</AppText>
        <Button label="설계사이트 →" fullWidth disabled={!safeExternalUrl(site.salesUrl)} onPress={() => void open(site.salesUrl)} />
        <Inline><Button label="공식홈" variant="secondary" size="sm" disabled={!safeExternalUrl(site.homepageUrl)} onPress={() => void open(site.homepageUrl)} style={styles.tab} /><Button label="공시실" variant="secondary" size="sm" disabled={!safeExternalUrl(site.disclosureUrl)} onPress={() => void open(site.disclosureUrl)} style={styles.tab} /></Inline>
      </Stack>
    </Card>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 }, content: { padding: theme.spacing.lg, paddingBottom: theme.spacing.xl, gap: theme.spacing.md }, tab: { flex: 1 },
    logoBox: { height: 72, alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md, backgroundColor: theme.colors.surfaceSubtle },
    logo: { width: '82%', height: 52 },
  });
}
