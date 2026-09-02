import { useMemo, useState } from 'react';
import { Linking, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import {
  AppText,
  Button,
  Card,
  IconButton,
  Inline,
  Screen,
  Stack,
  TextField,
  useAppTheme,
  type AppTheme,
} from '../../design-system';
import { getInsuranceCompanyDirectory } from './insuranceContactsApi';
import { categoryOf, companyMatches, formatPhone, normalizePhone } from './insuranceContactsModel';
import type { CompanyDirectoryEntry, InsuranceCategory } from './types';

const TABS: { id: InsuranceCategory; label: string }[] = [
  { id: 'LIFE', label: '생명' },
  { id: 'NON_LIFE', label: '손해' },
  { id: 'GENERAL', label: '일반' },
];

export function InsuranceContactsScreen() {
  const { token } = useAuth();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [category, setCategory] = useState<InsuranceCategory>('LIFE');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const query = useQuery({
    queryKey: ['insurance-company-directory'],
    queryFn: () => getInsuranceCompanyDirectory(token),
    enabled: Boolean(token),
  });
  const entries = useMemo(
    () =>
      (query.data ?? [])
        .filter((entry) => categoryOf(entry) === category && companyMatches(entry, search))
        .sort((a, b) => a.name.localeCompare(b.name, 'ko')),
    [query.data, category, search],
  );

  async function copyPhone(phone: string) {
    await Clipboard.setStringAsync(phone);
    setMessage('전화번호를 복사했습니다.');
  }

  return (
    <View style={styles.root}>
      <AppHeader title="원수사 연락처" />
      <Screen padded={false}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={query.isRefetching}
              onRefresh={() => void query.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        >
          <Inline>
            {TABS.map((tab) => (
              <Button
                key={tab.id}
                label={tab.label}
                size="sm"
                variant={category === tab.id ? 'selected' : 'secondary'}
                onPress={() => setCategory(tab.id)}
                style={styles.tab}
              />
            ))}
          </Inline>
          <TextField
            accessibilityLabel="보험사 또는 담당자 검색"
            placeholder="보험사 또는 담당자 검색"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
          />
          {message ? (
            <AppText color="success" accessibilityLiveRegion="polite">
              {message}
            </AppText>
          ) : null}
          {query.isLoading ? <LoadingState message="원수사 연락처를 불러오는 중…" /> : null}
          {query.isError ? (
            <ErrorState
              title="원수사 연락처를 불러오지 못했습니다"
              message={
                query.error instanceof Error
                  ? query.error.message
                  : '잠시 후 다시 시도해 주세요.'
              }
              onRetry={() => void query.refetch()}
            />
          ) : null}
          {!query.isLoading && !query.isError && entries.length === 0 ? (
            <Card variant="outlined">
              <AppText color="textSecondary" align="center">
                {search.trim()
                  ? '검색 결과가 없습니다.'
                  : '이 분류에 등록된 보험사가 없습니다.'}
              </AppText>
            </Card>
          ) : null}
          {entries.map((entry) => (
            <CompanyCard
              key={entry.id}
              entry={entry}
              onCopy={(phone) => void copyPhone(phone)}
              styles={styles}
            />
          ))}
        </ScrollView>
      </Screen>
    </View>
  );
}

function CompanyCard({
  entry,
  onCopy,
  styles,
}: {
  entry: CompanyDirectoryEntry;
  onCopy: (phone: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const fixed = [
    { label: '고객센터', phone: entry.customerCenter },
    { label: '전산문의', phone: entry.systemPhone },
    { label: '인콜', phone: entry.incallNumber },
  ].filter((row) => row.phone);

  return (
    <Card variant="elevated">
      <Stack gap="md">
        <AppText variant="heading">{entry.name}</AppText>
        {fixed.map((row) => (
          <PhoneRow
            key={row.label}
            label={row.label}
            phone={row.phone}
            onCopy={onCopy}
            styles={styles}
          />
        ))}
        {entry.visitInfo ? (
          <Inline>
            <AppText variant="label" style={styles.label}>
              방문일
            </AppText>
            <AppText style={styles.value}>{entry.visitInfo}</AppText>
          </Inline>
        ) : null}
        {entry.contacts.length ? (
          <View style={styles.contacts}>
            <Stack gap="sm">
              {entry.contacts.map((contact, index) => (
                <PhoneRow
                  key={contact.id || index}
                  label={
                    [contact.position, contact.name].filter(Boolean).join(' · ') ||
                    '담당자'
                  }
                  phone={contact.phone}
                  onCopy={onCopy}
                  styles={styles}
                />
              ))}
            </Stack>
          </View>
        ) : (
          <AppText variant="caption">등록된 담당자가 없습니다.</AppText>
        )}
      </Stack>
    </Card>
  );
}

function PhoneRow({
  label,
  phone,
  onCopy,
  styles,
}: {
  label: string;
  phone: string;
  onCopy: (phone: string) => void;
  styles: ReturnType<typeof createStyles>;
}) {
  const callable = normalizePhone(phone);
  return (
    <Inline align="center" style={styles.phoneRow}>
      <View style={styles.label}>
        <AppText color="textSecondary">{label}</AppText>
      </View>
      <AppText style={styles.value}>{phone ? formatPhone(phone) : '—'}</AppText>
      {phone ? (
        <Inline gap="xs">
          <IconButton
            accessibilityLabel={`${formatPhone(phone)} 전화`}
            variant="outlined"
            size="sm"
            onPress={() => void Linking.openURL(`tel:${callable}`)}
            icon={(color) => (
              <AppText accessibilityElementsHidden style={[styles.actionIcon, { color }]}>
                ☎
              </AppText>
            )}
          />
          <IconButton
            accessibilityLabel={`${formatPhone(phone)} 복사`}
            variant="outlined"
            size="sm"
            onPress={() => onCopy(phone)}
            icon={(color) => (
              <AppText accessibilityElementsHidden style={[styles.actionIcon, { color }]}>
                ⧉
              </AppText>
            )}
          />
        </Inline>
      ) : null}
    </Inline>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1 },
    content: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    tab: { flex: 1 },
    label: { width: 74 },
    value: { flex: 1, fontWeight: '600' },
    phoneRow: {
      minHeight: 42,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.colors.border,
    },
    contacts: { paddingTop: theme.spacing.sm },
    actionIcon: { fontSize: 16, lineHeight: 20 },
  });
}
