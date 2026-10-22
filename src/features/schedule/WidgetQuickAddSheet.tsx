import { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { matchesCustomerPickerQuery } from '../customers/customerPickerSearch';
import { AppText, Button, Inline, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { ScheduleDateField } from './ScheduleDateField';
import type { WidgetQuickDraft } from './widgetQuickAddModel';

export type QuickAddCustomer = { id: string; name: string; phone: string };

type WidgetQuickAddSheetProps = {
  open: boolean;
  kind: 'schedule' | 'todo';
  date: string;
  busy?: boolean;
  error?: string | null;
  customers?: QuickAddCustomer[];
  customersLoading?: boolean;
  onClose: () => void;
  onSubmit: (draft: WidgetQuickDraft) => void;
};

/** 위젯이 앱에서 여는 빠른 추가. 날짜·시각은 일정·할 일과 같은 달력이다. */
export function WidgetQuickAddSheet({
  open,
  kind,
  date,
  busy = false,
  error = null,
  customers = [],
  customersLoading = false,
  onClose,
  onSubmit,
}: WidgetQuickAddSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [pickedDate, setPickedDate] = useState(date);
  const [time, setTime] = useState('');
  const [customer, setCustomer] = useState<QuickAddCustomer | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [openRequest, setOpenRequest] = useState<{ id: number; clock: boolean } | null>(null);

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setPickedDate(date);
    setTime('');
    setCustomer(null);
    setCustomerOpen(false);
    setSearch('');
    setOpenRequest(null);
  }, [open, date]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    onSubmit({
      title: trimmed,
      date: pickedDate,
      time,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? '',
    });
  };
  const matches = search.trim().length < 2
    ? []
    : customers.filter((item) => matchesCustomerPickerQuery({ name: item.name, phone: item.phone }, search)).slice(0, 10);
  const askWhen = (clock: boolean) => {
    setCustomerOpen(false);
    setOpenRequest((current) => ({ id: (current?.id ?? 0) + 1, clock }));
  };
  const whenLabel = time ? `${pickedDate} ${time}` : `${pickedDate} · 종일`;

  return (
    <Modal visible={open} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" style={styles.backdrop} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + theme.spacing.md }]}>
            <Inline gap="sm" align="center">
              <TextInput
                style={styles.title}
                value={title}
                onChangeText={setTitle}
                placeholder={kind === 'schedule' ? '새 일정' : '새 할 일'}
                placeholderTextColor={theme.colors.textMuted}
                autoFocus
                maxLength={300}
                returnKeyType="done"
                onSubmitEditing={submit}
              />
              <Button label="OK" variant="primary" disabled={!title.trim() || busy} loading={busy} onPress={submit} />
            </Inline>
            <AppText variant="caption" color="textSecondary">{whenLabel}</AppText>
            {customer ? (
              <Inline gap="xs" align="center" style={styles.chip}>
                <AppText variant="bodyStrong">{customer.name}</AppText>
                <Button label="해제" variant="ghost" size="sm" accessibilityLabel={`${customer.name} 해제`} onPress={() => setCustomer(null)} />
              </Inline>
            ) : null}
            <ScheduleDateField
              label="날짜"
              hideTrigger
              value={pickedDate}
              time={time}
              openRequest={openRequest}
              onComplete={({ date: nextDate, time: nextTime }) => {
                setPickedDate(nextDate || date);
                setTime(nextTime);
              }}
            />
            {customerOpen ? (
              <View style={styles.extra}>
                <TextField label="고객 검색" value={search} onChangeText={setSearch} placeholder="이름 또는 전화번호 2글자 이상" />
                {customersLoading && search.trim().length >= 2 ? <AppText variant="caption">검색 중…</AppText> : null}
                {matches.map((item) => (
                  <Button
                    key={item.id}
                    label={item.name}
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onPress={() => { setCustomer(item); setSearch(''); setCustomerOpen(false); }}
                  />
                ))}
              </View>
            ) : null}
            {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
            <View style={styles.toolbar}>
              <Pressable accessibilityRole="button" accessibilityLabel="날짜" onPress={() => askWhen(false)} style={styles.tool}>
                <AppText variant="caption" color="textSecondary">날짜</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="시간" onPress={() => askWhen(true)} style={[styles.tool, time ? styles.toolOn : null]}>
                <AppText variant="caption" color={time ? 'primary' : 'textSecondary'}>시간</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="고객 연결" onPress={() => setCustomerOpen((current) => !current)} style={[styles.tool, customer ? styles.toolOn : null]}>
                <AppText variant="caption" color={customer ? 'primary' : 'textSecondary'}>고객 연결</AppText>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end' },
    backdrop: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      backgroundColor: theme.colors.overlay,
    },
    sheet: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: theme.radius.lg,
      borderTopRightRadius: theme.radius.lg,
      padding: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    title: {
      flex: 1,
      minHeight: 44,
      color: theme.colors.text,
      fontSize: 18,
      paddingHorizontal: theme.spacing.sm,
    },
    extra: { gap: theme.spacing.sm },
    chip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.full,
      paddingLeft: theme.spacing.sm,
    },
    toolbar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: theme.colors.border,
      paddingTop: theme.spacing.sm,
    },
    tool: {
      minHeight: 36,
      justifyContent: 'center',
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.full,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    toolOn: { backgroundColor: theme.colors.primarySoft },
  });
}
