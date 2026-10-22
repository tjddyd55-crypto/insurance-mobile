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
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { matchesCustomerPickerQuery } from '../customers/customerPickerSearch';
import { AppText, Button, Inline, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { ScheduleMonthCalendar } from './ScheduleDateField';
import { dateFromHm, hmFromDate } from './ScheduleTimeField';
import { formatDayTitle } from './scheduleModel';
import type { WidgetQuickDraft } from './widgetQuickAddModel';

export type QuickAddCustomer = { id: string; name: string; phone: string };

type Panel = 'date' | 'time' | 'customer';

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

/** 위젯이 앱에서 여는 빠른 추가. 제목과 OK만으로 저장되고, 부가정보에서 날짜·시각·고객을 고친다. */
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
  const [expanded, setExpanded] = useState(false);
  const [panel, setPanel] = useState<Panel>('date');
  const [search, setSearch] = useState('');
  const [pickerKey, setPickerKey] = useState(0);
  const [clock, setClock] = useState(() => dateFromHm('09:00'));

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setPickedDate(date);
    setTime('');
    setCustomer(null);
    setExpanded(false);
    setPanel('date');
    setSearch('');
    setPickerKey((key) => key + 1);
    setClock(dateFromHm('09:00'));
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
            <Button
              label="부가정보"
              variant={expanded ? 'selected' : 'secondary'}
              onPress={() => {
                setExpanded((current) => !current);
                setPanel('date');
              }}
            />
            {expanded ? (
              <ExtraPanel
                styles={styles}
                panel={panel}
                pickedDate={pickedDate}
                time={time}
                customer={customer}
                search={search}
                customers={customers}
                customersLoading={customersLoading}
                pickerKey={pickerKey}
                clock={clock}
                onPanel={setPanel}
                onDate={setPickedDate}
                onSearch={setSearch}
                onCustomer={(next) => {
                  setCustomer(next);
                  setSearch('');
                }}
                onClearCustomer={() => setCustomer(null)}
                onClock={setClock}
                onTime={setTime}
              />
            ) : null}
            {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function ExtraPanel(props: {
  styles: ReturnType<typeof createStyles>;
  panel: Panel;
  pickedDate: string;
  time: string;
  customer: QuickAddCustomer | null;
  search: string;
  customers: QuickAddCustomer[];
  customersLoading: boolean;
  pickerKey: number;
  clock: Date;
  onPanel: (panel: Panel) => void;
  onDate: (ymd: string) => void;
  onSearch: (value: string) => void;
  onCustomer: (customer: QuickAddCustomer) => void;
  onClearCustomer: () => void;
  onClock: (date: Date) => void;
  onTime: (value: string) => void;
}) {
  const matches = props.search.trim().length < 2
    ? []
    : props.customers
      .filter((customer) => matchesCustomerPickerQuery({ name: customer.name, phone: customer.phone }, props.search))
      .slice(0, 10);
  return (
    <View style={props.styles.extra}>
      {props.panel === 'date' ? <ScheduleMonthCalendar key={props.pickerKey} value={props.pickedDate} onChoose={props.onDate} /> : null}
      {props.panel === 'time' ? <TimePanel styles={props.styles} clock={props.clock} onClock={props.onClock} onTime={props.onTime} /> : null}
      {props.panel === 'customer' ? (
        <CustomerPanel
          styles={props.styles}
          search={props.search}
          loading={props.customersLoading && props.search.trim().length >= 2}
          matches={matches}
          onSearch={props.onSearch}
          onCustomer={props.onCustomer}
        />
      ) : null}
      <ChoiceRow styles={props.styles} label="날짜" value={formatDayTitle(props.pickedDate)} selected={props.panel === 'date'} onPress={() => props.onPanel('date')} />
      <ChoiceRow styles={props.styles} label="시간" value={props.time || '시간 없음'} selected={props.panel === 'time'} onPress={() => props.onPanel('time')} />
      <ChoiceRow
        styles={props.styles}
        label="고객 연결"
        value={props.customer?.name || '없음'}
        selected={props.panel === 'customer'}
        onPress={() => props.onPanel('customer')}
      />
      {props.customer ? (
        <Inline gap="sm" align="center">
          <AppText variant="bodyStrong">{props.customer.name}</AppText>
          <Button label="해제" variant="ghost" size="sm" accessibilityLabel={`${props.customer.name} 해제`} onPress={props.onClearCustomer} />
        </Inline>
      ) : null}
    </View>
  );
}

function ChoiceRow({
  styles,
  label,
  value,
  selected,
  onPress,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.row, selected && styles.rowOn]}>
      <AppText variant="bodyStrong">{label}</AppText>
      <AppText variant="body" color="textSecondary">{value}</AppText>
    </Pressable>
  );
}

function TimePanel({
  styles,
  clock,
  onClock,
  onTime,
}: {
  styles: ReturnType<typeof createStyles>;
  clock: Date;
  onClock: (date: Date) => void;
  onTime: (value: string) => void;
}) {
  const onChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) return;
    onClock(selected);
    if (Platform.OS === 'android') onTime(hmFromDate(selected));
  };
  return (
    <View style={styles.panel}>
      <DateTimePicker mode="time" display={Platform.OS === 'ios' ? 'spinner' : 'default'} is24Hour={false} value={clock} onChange={onChange} />
      {Platform.OS === 'ios' ? <Button label="이 시각" variant="primary" onPress={() => onTime(hmFromDate(clock))} /> : null}
      <Button label="시간 없음" variant="ghost" onPress={() => onTime('')} />
    </View>
  );
}

function CustomerPanel({
  styles,
  search,
  loading,
  matches,
  onSearch,
  onCustomer,
}: {
  styles: ReturnType<typeof createStyles>;
  search: string;
  loading: boolean;
  matches: QuickAddCustomer[];
  onSearch: (value: string) => void;
  onCustomer: (customer: QuickAddCustomer) => void;
}) {
  return (
    <View style={styles.panel}>
      <TextField label="고객 검색" value={search} onChangeText={onSearch} placeholder="이름 또는 전화번호 2글자 이상" />
      {loading ? <AppText variant="caption">검색 중…</AppText> : null}
      {matches.map((customer) => (
        <Button
          key={customer.id}
          label={customer.name}
          variant="secondary"
          size="sm"
          fullWidth
          onPress={() => onCustomer(customer)}
        />
      ))}
    </View>
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
    panel: { gap: theme.spacing.sm },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    rowOn: { backgroundColor: theme.colors.primarySoft },
  });
}
