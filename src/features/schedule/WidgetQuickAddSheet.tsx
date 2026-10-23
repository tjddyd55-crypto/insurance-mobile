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
import { ScheduleMonthCalendar } from './ScheduleDateField';
import { formatKoreanClock, ScheduleTimeField } from './ScheduleTimeField';
import { scheduleEventWriteTimes, withScheduleEndTime, withScheduleStartTime } from './scheduleModel';
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
  /** 고객 연결을 열 때만 고객 목록을 불러 제목 저장이 느려지지 않게 한다. */
  onNeedCustomers?: () => void;
};

type ExtraMode = 'date' | 'time' | 'customer';

/** 위젯이 앱에서 여는 빠른 추가. 제목만 저장하면 종일. 시간은 부가정보에서 켠다. */
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
  onNeedCustomers,
}: WidgetQuickAddSheetProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [pickedDate, setPickedDate] = useState(date);
  const [timed, setTimed] = useState(false);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [customer, setCustomer] = useState<QuickAddCustomer | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<ExtraMode>('date');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!open) return;
    setTitle('');
    setPickedDate(date);
    setTimed(false);
    setStartTime('09:00');
    setEndTime('10:00');
    setCustomer(null);
    setExpanded(false);
    setMode('date');
    setSearch('');
  }, [open, date]);

  const submit = () => {
    const trimmed = title.trim();
    if (!trimmed || busy) return;
    onSubmit({
      title: trimmed,
      date: pickedDate,
      time: timed && kind === 'schedule' ? startTime : '',
      endTime: timed && kind === 'schedule' ? endTime : '',
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? '',
    });
  };
  const showTime = () => setMode('time');
  const showCustomers = () => {
    setMode('customer');
    onNeedCustomers?.();
  };
  const enableTime = () => {
    if (timed) {
      setTimed(false);
      return;
    }
    const next = scheduleEventWriteTimes({ allDay: false, date: pickedDate, endDate: pickedDate, startTime, endTime });
    setStartTime(next.startTime ?? startTime);
    setEndTime(next.endTime ?? endTime);
    setTimed(true);
  };
  const matches = search.trim().length < 2
    ? []
    : customers.filter((item) => matchesCustomerPickerQuery({ name: item.name, phone: item.phone }, search)).slice(0, 10);

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
              <Button label="확인" variant="primary" disabled={!title.trim() || busy} loading={busy} onPress={submit} />
            </Inline>
            <Button label="부가정보" variant={expanded ? 'selected' : 'secondary'} onPress={() => setExpanded((current) => !current)} />
            {expanded ? (
              <View style={styles.extra}>
                <Inline gap="sm">
                  <Button label="날짜" size="sm" variant={mode === 'date' ? 'selected' : 'secondary'} onPress={() => setMode('date')} />
                  {kind === 'schedule' ? (
                    <Button label="시간" size="sm" variant={mode === 'time' ? 'selected' : 'secondary'} onPress={showTime} />
                  ) : null}
                  <Button label="고객 연결" size="sm" variant={mode === 'customer' ? 'selected' : 'secondary'} onPress={showCustomers} />
                </Inline>
                {mode === 'date' ? (
                  <ScheduleMonthCalendar value={pickedDate} onChoose={setPickedDate} />
                ) : null}
                {mode === 'time' && kind === 'schedule' ? (
                  <View style={styles.extra}>
                    <Inline justify="space-between" align="center" style={styles.row}>
                      <AppText variant="bodyStrong">시간</AppText>
                      <AppText variant="body" color="textSecondary">{timed ? `${formatKoreanClock(startTime)} ~ ${formatKoreanClock(endTime)}` : '종일'}</AppText>
                    </Inline>
                    <Button
                      label="시간 지정"
                      variant={timed ? 'selected' : 'secondary'}
                      accessibilityState={{ selected: timed }}
                      onPress={enableTime}
                    />
                    {timed ? (
                      <View style={styles.extra}>
                        <ScheduleTimeField
                          label="시작 시간"
                          value={startTime}
                          onChange={(next) => {
                            const fixed = withScheduleStartTime({ allDay: false, startTime, endTime }, next);
                            setStartTime(fixed.startTime);
                            setEndTime(fixed.endTime);
                          }}
                        />
                        <ScheduleTimeField
                          label="종료 시간"
                          value={endTime}
                          onChange={(next) => {
                            const fixed = withScheduleEndTime({ allDay: false, startTime, endTime }, next);
                            setStartTime(fixed.startTime);
                            setEndTime(fixed.endTime);
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : null}
                {mode === 'customer' ? (
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
                        onPress={() => { setCustomer(item); setSearch(''); }}
                      />
                    ))}
                    {customer ? (
                      <Inline gap="sm" align="center" style={styles.chip}>
                        <AppText variant="bodyStrong">{customer.name}</AppText>
                        <Button label="×" variant="ghost" size="sm" accessibilityLabel={`${customer.name} 해제`} onPress={() => setCustomer(null)} />
                      </Inline>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : null}
            {error ? <AppText variant="caption" color="danger">{error}</AppText> : null}
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
    row: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    chip: {
      alignSelf: 'flex-start',
      backgroundColor: theme.colors.primarySoft,
      borderRadius: theme.radius.full,
      paddingLeft: theme.spacing.sm,
    },
  });
}
