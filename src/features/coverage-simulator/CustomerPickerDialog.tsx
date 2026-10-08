import { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuth } from '../../auth/AuthProvider';
import { ModalShell, TextField } from '../../design-system';
import { listCustomers } from '../customers/customersApi';
import {
  filterCoverageCustomerPickerRows,
  formatCoveragePickerMobileRow,
  toCoverageCustomerPickerRow,
} from './coverageCustomerPickerPresentation';
import { useCoverageCustomer } from './CoverageCustomerContext';
import { simulatorTheme as theme } from './simulatorTheme';

const PANEL_HEIGHT_RATIO = 0.72;

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CustomerPickerDialog({ open, onClose }: Props) {
  const { token } = useAuth();
  const customer = useCoverageCustomer();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!open) {
      setKeyboardInset(0);
      return;
    }
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (event) => {
      setKeyboardInset(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardInset(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [open]);

  const dialogMaxHeightPx = useMemo(() => {
    const windowHeight = Dimensions.get('window').height;
    const overlayPad = 48;
    const available = windowHeight - insets.top - insets.bottom - keyboardInset - overlayPad;
    const preferred = Math.round(windowHeight * PANEL_HEIGHT_RATIO);
    return Math.max(280, Math.min(preferred, available));
  }, [insets.bottom, insets.top, keyboardInset]);

  const query = useQuery({
    queryKey: ['coverage-simulator', 'customers'],
    queryFn: () => listCustomers(token, { limit: 200 }),
    enabled: open && Boolean(token),
  });
  const rows = useMemo(() => {
    const mapped = (query.data?.customers ?? []).map(toCoverageCustomerPickerRow);
    return filterCoverageCustomerPickerRows(mapped, search);
  }, [query.data, search]);

  const requestClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const selectCustomer = (item: (typeof rows)[number]) => {
    customer.setCustomer({
      id: item.id,
      name: item.name === '—' ? '' : item.name,
      birthDate: item.birthDate,
      phone: item.phone,
    });
    Keyboard.dismiss();
    onClose();
  };

  return (
    <ModalShell
      open={open}
      title="고객 선택"
      presentation="dialog"
      scroll={false}
      dialogFillBody
      keyboardAvoiding
      dialogMaxHeightPx={dialogMaxHeightPx}
      dialogWidth="92%"
      closeOnBackdrop={false}
      onRequestClose={requestClose}
      headerAction={
        <Text accessibilityRole="button" onPress={requestClose} style={styles.close}>
          닫기
        </Text>
      }
    >
      <View style={styles.shell}>
        <View style={styles.searchBlock}>
          <TextField
            accessibilityLabel="고객 검색"
            placeholder="이름 · 생년월일 · 연락처"
            value={search}
            onChangeText={setSearch}
          />
          {query.isError ? <Text style={styles.error}>고객 목록을 불러오지 못했습니다.</Text> : null}
        </View>
        <FlatList
          style={styles.list}
          data={rows}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            !query.isLoading ? <Text style={styles.empty}>표시할 고객이 없습니다.</Text> : null
          }
          renderItem={({ item }) => {
            const lines = formatCoveragePickerMobileRow(item);
            return (
              <Pressable
                accessibilityRole="button"
                onPress={() => selectCustomer(item)}
                style={styles.row}
              >
                <Text style={styles.nameLine}>{lines.primary}</Text>
                <Text style={styles.metaLine}>{lines.secondary}</Text>
              </Pressable>
            );
          }}
        />
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  close: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  shell: {
    flex: 1,
    minHeight: 0,
  },
  searchBlock: {
    flexShrink: 0,
    gap: 8,
    paddingBottom: 8,
  },
  list: {
    flex: 1,
    minHeight: 0,
  },
  listContent: { paddingBottom: 8 },
  row: {
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.border,
    gap: 4,
  },
  nameLine: { fontSize: 15, fontWeight: '700', color: theme.text },
  metaLine: { fontSize: 14, color: theme.muted, lineHeight: 20, flexWrap: 'wrap' },
  empty: { textAlign: 'center', color: theme.muted, fontSize: 13, padding: 16 },
  error: { color: theme.danger },
});
