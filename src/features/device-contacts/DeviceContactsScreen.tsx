import { useMemo, useState, useSyncExternalStore } from 'react';
import { FlatList, Linking, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '../../auth/AuthProvider';
import { AppHeader } from '../../components/AppHeader';
import { EmptyState } from '../../components/EmptyState';
import { ErrorState } from '../../components/ErrorState';
import { LoadingState } from '../../components/LoadingState';
import { SearchControlRow } from '../../components/SearchControlRow';
import {
  AppText,
  Badge,
  Button,
  Inline,
  Stack,
  useAppTheme,
  type AppTheme,
  Screen,
} from '../../design-system';
import { DeviceContactDetailModal } from './DeviceContactDetailModal';
import { DeviceContactsPermissionPanel } from './DeviceContactsPermissionPanel';
import {
  contactsPermissionPanelModel,
  deviceContactEmptyMessage,
  type ContactsPermissionPhase,
} from './deviceContactPermission';
import {
  DEVICE_CONTACT_FILTER_LABELS,
  selectDeviceContacts,
} from './deviceContactQuery';
import { DEFAULT_DEVICE_CONTACT_FILTER } from './deviceContactTypes';
import {
  buildContactRegistrationParams,
  buildDeviceContactDialUrl,
  decideContactRegistration,
} from './deviceContactRegistration';
import { deviceContactStore } from './deviceContactSession';
import type { DeviceContactFilter, DeviceContactRecord } from './deviceContactTypes';
import { useDeviceContacts } from './useDeviceContacts';

const FILTERS: DeviceContactFilter[] = ['all', 'unregistered', 'customer', 'duplicate'];

const MATCH_LABEL = {
  customer: '고객',
  unregistered: '미등록',
  duplicate: '중복 후보',
} as const;

export function DeviceContactsScreen() {
  const { token, user } = useAuth();
  const router = useRouter();
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const snapshot = useSyncExternalStore(
    deviceContactStore.subscribe,
    deviceContactStore.getSnapshot,
    deviceContactStore.getSnapshot,
  );
  const { phase, loading, refreshing, errorMessage, refresh, requestAccess } = useDeviceContacts(
    user ? { id: user.id, gaId: user.gaId } : null,
    token,
  );
  const [filter, setFilter] = useState<DeviceContactFilter>(DEFAULT_DEVICE_CONTACT_FILTER);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [alreadyCustomerId, setAlreadyCustomerId] = useState<number | null>(null);
  const [candidateNotice, setCandidateNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const visible = useMemo(
    () => selectDeviceContacts(snapshot.contacts, filter, query),
    [filter, query, snapshot.contacts],
  );
  const selected = snapshot.contacts.find((contact) => contact.contactId === selectedId) ?? null;
  const emptyMessage = deviceContactEmptyMessage({
    filter,
    query,
    totalContacts: snapshot.contacts.length,
    visibleCount: visible.length,
  });

  const openDial = async (phone: string, scheme: 'tel' | 'sms') => {
    const url = buildDeviceContactDialUrl(phone, scheme);
    if (!url) {
      return;
    }
    try {
      await Linking.openURL(url);
    } catch {
      setActionError(scheme === 'tel' ? '전화 앱을 열지 못했습니다.' : '문자 앱을 열지 못했습니다.');
    }
  };

  const openCustomer = (customerId: number) => {
    setSelectedId(null);
    router.push(`/customers/${customerId}`);
  };

  const registerSelected = () => {
    if (!selected) {
      return;
    }
    const fresh = deviceContactStore.rematchContact(selected.contactId) ?? selected;
    const decision = decideContactRegistration(fresh.matchedCustomerIds);
    if (decision.type === 'already_registered') {
      setAlreadyCustomerId(decision.customerId);
      return;
    }
    if (decision.type === 'choose_candidate') {
      setCandidateNotice('이미 등록된 고객이 여러 명입니다. 아래에서 고객을 선택해 주세요.');
      return;
    }
    const params = buildContactRegistrationParams(fresh);
    setSelectedId(null);
    router.push({ pathname: '/customers/new', params });
  };

  return (
    <View style={styles.root}>
      <AppHeader
        title="연락처"
        rightAction={<Button label="새로고침" size="sm" variant="ghost" onPress={() => void refresh('manual')} />}
      />
      <Screen padded={false}>
        <ContactsBody
          phase={phase}
          loading={loading}
          refreshing={refreshing}
          errorMessage={errorMessage ?? actionError}
          contacts={snapshot.contacts}
          visible={visible}
          filter={filter}
          query={query}
          truncated={snapshot.customerIndexTruncated}
          cacheFailed={snapshot.cacheWrite === 'failed'}
          emptyMessage={emptyMessage}
          onRetry={() => void refresh('manual')}
          onRequestAccess={() => void requestAccess()}
          onOpenSettings={() => {
            void Linking.openSettings().catch(() => {
              setActionError('설정 화면을 열지 못했습니다.');
            });
          }}
          onQueryChange={setQuery}
          onFilterChange={setFilter}
          onRefresh={() => void refresh('manual')}
          onOpenContact={(contactId) => {
            setCandidateNotice(null);
            setSelectedId(contactId);
          }}
        />
      </Screen>
      <DeviceContactDetailModal
        contact={selected}
        customers={snapshot.customers}
        alreadyRegistered={alreadyCustomerId != null}
        candidateNotice={candidateNotice}
        onClose={() => setSelectedId(null)}
        onCall={(phone) => void openDial(phone, 'tel')}
        onSms={(phone) => void openDial(phone, 'sms')}
        onOpenCustomer={openCustomer}
        onRegister={registerSelected}
        onConfirmAlready={() => {
          const customerId = alreadyCustomerId;
          setAlreadyCustomerId(null);
          if (customerId != null) {
            openCustomer(customerId);
          }
        }}
        onDismissAlready={() => setAlreadyCustomerId(null)}
      />
    </View>
  );
}

function ContactsBody(props: {
  phase: ContactsPermissionPhase;
  loading: boolean;
  refreshing: boolean;
  errorMessage: string | null;
  contacts: DeviceContactRecord[];
  visible: DeviceContactRecord[];
  filter: DeviceContactFilter;
  query: string;
  truncated: boolean;
  cacheFailed: boolean;
  emptyMessage: string | null;
  onRetry: () => void;
  onRequestAccess: () => void;
  onOpenSettings: () => void;
  onQueryChange: (value: string) => void;
  onFilterChange: (filter: DeviceContactFilter) => void;
  onRefresh: () => void;
  onOpenContact: (contactId: string) => void;
}) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  if (props.phase === 'checking' || (props.loading && props.contacts.length === 0 && props.phase === 'granted')) {
    return <LoadingState message="연락처를 불러오는 중…" />;
  }
  if (contactsPermissionPanelModel(props.phase)) {
    return (
      <DeviceContactsPermissionPanel
        phase={props.phase}
        onRequestAccess={props.onRequestAccess}
        onOpenSettings={props.onOpenSettings}
      />
    );
  }
  if (props.errorMessage && props.contacts.length === 0) {
    return <ErrorState title="연락처를 불러오지 못했습니다" message={props.errorMessage} onRetry={props.onRetry} />;
  }
  return (
    <FlatList
      data={props.visible}
      keyExtractor={(item) => item.contactId}
      contentContainerStyle={styles.list}
      refreshControl={<RefreshControl refreshing={props.refreshing} onRefresh={props.onRefresh} />}
      ListHeaderComponent={
        <ContactListHeader
          filter={props.filter}
          query={props.query}
          truncated={props.truncated}
          cacheFailed={props.cacheFailed}
          errorMessage={props.errorMessage}
          onQueryChange={props.onQueryChange}
          onFilterChange={props.onFilterChange}
        />
      }
      ListEmptyComponent={props.emptyMessage ? <EmptyState title={props.emptyMessage} /> : null}
      renderItem={({ item }) => <ContactRow contact={item} onPress={() => props.onOpenContact(item.contactId)} />}
    />
  );
}

function ContactListHeader(props: {
  filter: DeviceContactFilter;
  query: string;
  truncated: boolean;
  cacheFailed: boolean;
  errorMessage: string | null;
  onQueryChange: (value: string) => void;
  onFilterChange: (filter: DeviceContactFilter) => void;
}) {
  return (
    <Stack gap="sm">
      <SearchControlRow
        placeholder="이름, 번호, 회사"
        accessibilityLabel="연락처 검색"
        value={props.query}
        onChangeText={props.onQueryChange}
        onSubmit={() => undefined}
        showSearchButton={false}
      />
      <Inline wrap>
        {FILTERS.map((filter) => (
          <Button
            key={filter}
            label={DEVICE_CONTACT_FILTER_LABELS[filter]}
            size="sm"
            variant={props.filter === filter ? 'selected' : 'secondary'}
            onPress={() => props.onFilterChange(filter)}
          />
        ))}
      </Inline>
      {props.truncated ? (
        <AppText variant="caption" color="textSecondary">
          고객 대조는 서버가 한 번에 내려주는 범위까지입니다. 그 밖 고객은 미등록으로 보일 수 있습니다.
        </AppText>
      ) : null}
      {props.cacheFailed ? (
        <AppText variant="caption" color="danger">
          연락처 대조 캐시를 저장하지 못했습니다. 이번 화면의 결과는 유지됩니다.
        </AppText>
      ) : null}
      {props.errorMessage ? <AppText color="danger">{props.errorMessage}</AppText> : null}
    </Stack>
  );
}

function ContactRow({ contact, onPress }: { contact: DeviceContactRecord; onPress: () => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const phone = contact.phones[0] || '전화번호 없음';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${contact.displayName || '이름 없음'} ${MATCH_LABEL[contact.matchState]}`} onPress={onPress} style={styles.card}>
      <Inline justify="space-between">
        <AppText variant="bodyStrong" numberOfLines={1} style={styles.name}>
          {contact.displayName.trim() || '이름 없음'}
        </AppText>
        <Badge
          label={MATCH_LABEL[contact.matchState]}
          tone={contact.matchState === 'duplicate' ? 'warning' : contact.matchState === 'customer' ? 'success' : 'default'}
        />
      </Inline>
      <AppText variant="body" color="textSecondary">{phone}</AppText>
      {contact.organization ? <AppText variant="caption" color="textMuted">{contact.organization}</AppText> : null}
    </Pressable>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: theme.colors.background },
    list: { padding: theme.layout.screenPaddingHorizontal, gap: theme.spacing.sm, flexGrow: 1 },
    card: {
      gap: theme.spacing.xs,
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    name: { flex: 1, marginRight: theme.spacing.sm },
  });
}
