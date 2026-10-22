import { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { AppText, Button, Card, Inline, ModalShell, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { dateFromHm, hmFromDate } from './ScheduleTimeField';
import { formatDayTitle, formatMonthTitle, monthGrid, seoulYmd, shiftMonth } from './scheduleModel';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

type ScheduleDateFieldProps = {
  label: string;
  value: string;
  /** 비어 있으면 종일. 완료 전까지 저장되지 않는다. */
  time?: string;
  onChange?: (value: string) => void;
  onComplete?: (value: { date: string; time: string }) => void;
  /** 할 일 날짜처럼 비워 둘 수 있다. */
  clearable?: boolean;
  placeholder?: string;
  /** 위젯 시트처럼 바깥 버튼이 달력을 연다. */
  hideTrigger?: boolean;
  /** id 가 늘 때만 연다. clock 이면 시계를 바로 보여 준다. */
  openRequest?: { id: number; clock: boolean } | null;
};

function shownValue(date: string, time: string): string {
  if (!date) return '';
  return HM.test(time) ? `${date} ${time}` : `${date} · 종일`;
}

/** 일정·할 일 날짜와 시각. 달력과 시간 설정은 완료를 눌러야 반영된다. */
export function ScheduleDateField({
  label,
  value,
  time = '',
  onChange,
  onComplete,
  clearable = false,
  placeholder = '날짜 선택',
  hideTrigger = false,
  openRequest = null,
}: ScheduleDateFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [draftTime, setDraftTime] = useState('');
  const [pickerKey, setPickerKey] = useState(0);
  const [clockOpen, setClockOpen] = useState(false);
  const [clock, setClock] = useState(() => dateFromHm('09:00'));
  const stored = YMD.test(value) ? value : '';
  const storedTime = HM.test(time) ? time : '';
  const requestId = openRequest?.id ?? 0;

  useEffect(() => {
    if (!requestId) return;
    const nextDate = YMD.test(value) ? value : '';
    const nextTime = HM.test(time ?? '') ? time ?? '' : '';
    setDraft(nextDate);
    setDraftTime(nextTime);
    setClock(dateFromHm(nextTime || '09:00'));
    setClockOpen(openRequest?.clock === true);
    setPickerKey((key) => key + 1);
    setOpen(true);
    // 요청 id 가 늘 때만 연다. 완료로 날짜가 바뀌면 다시 열지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  const openPicker = () => {
    setDraft(stored);
    setDraftTime(storedTime);
    setClockOpen(false);
    setPickerKey((key) => key + 1);
    setOpen(true);
  };
  const cancel = () => setOpen(false);
  const commit = () => {
    onChange?.(draft);
    onComplete?.({ date: draft, time: draftTime });
    setOpen(false);
  };
  const openClock = () => {
    setClock(dateFromHm(draftTime || '09:00'));
    setClockOpen(true);
  };
  const onClock = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed' || !selected) {
      setClockOpen(false);
      return;
    }
    setClock(selected);
    setDraftTime(hmFromDate(selected));
    if (Platform.OS === 'android') setClockOpen(false);
  };

  return (
    <View style={styles.flex}>
      {hideTrigger ? null : (
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} 달력 열기`} onPress={openPicker}>
          <TextField label={label} value={shownValue(stored, storedTime)} placeholder={placeholder} editable={false} pointerEvents="none" importantForAccessibility="no-hide-descendants" />
        </Pressable>
      )}
      <ModalShell
        open={open}
        title={label}
        presentation="dialog"
        scroll
        onRequestClose={cancel}
        footer={
          <Inline gap="sm">
            <View style={styles.flex}><Button label="취소" fullWidth onPress={cancel} /></View>
            <View style={styles.flex}><Button label="완료" variant="primary" fullWidth onPress={commit} /></View>
          </Inline>
        }
      >
        <ScheduleMonthCalendar key={pickerKey} value={draft} onChoose={setDraft} />
        <Pressable accessibilityRole="button" accessibilityLabel="시간 설정" onPress={openClock} style={styles.timeRow}>
          <AppText variant="bodyStrong">시간 설정</AppText>
          <AppText variant="body" color="textSecondary">{draftTime || '종일'}</AppText>
        </Pressable>
        {clockOpen ? (
          <View style={styles.clock}>
            <DateTimePicker
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              is24Hour={false}
              value={clock}
              onChange={onClock}
              style={styles.clockPicker}
            />
          </View>
        ) : null}
        {draftTime ? <Button label="종일" variant="ghost" onPress={() => { setDraftTime(''); setClockOpen(false); }} /> : null}
        {clearable ? <Button label="날짜 없음" variant="ghost" onPress={() => { setDraft(''); setDraftTime(''); }} /> : null}
      </ModalShell>
    </View>
  );
}

function monthAnchor(value: string): string {
  const base = YMD.test(value) ? value : seoulYmd();
  return `${base.slice(0, 7)}-01`;
}

/** 월 그리드. 칸을 누르면 그 날의 YYYY-MM-DD 를 고른 상태로만 둔다. */
export function ScheduleMonthCalendar({ value, onChoose }: { value: string; onChoose: (ymd: string) => void }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [month, setMonth] = useState(() => monthAnchor(value));
  return <StackMonth month={month} value={value} styles={styles} onMonth={setMonth} onChoose={onChoose} />;
}

function StackMonth({
  month,
  value,
  styles,
  onMonth,
  onChoose,
}: {
  month: string;
  value: string;
  styles: ReturnType<typeof createStyles>;
  onMonth: (month: string) => void;
  onChoose: (ymd: string) => void;
}) {
  return (
    <>
      <Inline justify="space-between">
        <Button label="‹" variant="ghost" size="sm" accessibilityLabel="이전 달" onPress={() => onMonth(shiftMonth(month, -1))} />
        <AppText variant="sectionTitle">{formatMonthTitle(month)}</AppText>
        <Button label="›" variant="ghost" size="sm" accessibilityLabel="다음 달" onPress={() => onMonth(shiftMonth(month, 1))} />
      </Inline>
      <Card variant="outlined" padding="sm">
        <View style={styles.weekRow}>
          {WEEKDAYS.map((name) => (
            <AppText key={name} variant="caption" color="textMuted" align="center" style={styles.cell}>{name}</AppText>
          ))}
        </View>
        {monthGrid(month).map((week) => (
          <View key={week[0]!.ymd} style={styles.weekRow}>
            {week.map((cell) => {
              const selected = cell.ymd === value;
              return (
                <Pressable
                  key={cell.ymd}
                  accessibilityRole="button"
                  accessibilityLabel={formatDayTitle(cell.ymd)}
                  accessibilityState={{ selected }}
                  style={[styles.cell, styles.dayCell, selected && styles.dayActive]}
                  onPress={() => onChoose(cell.ymd)}
                >
                  <AppText variant="body" color={selected ? 'onPrimary' : cell.inMonth ? 'text' : 'textMuted'}>{cell.day}</AppText>
                </Pressable>
              );
            })}
          </View>
        ))}
      </Card>
    </>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    timeRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.radius.md,
      backgroundColor: theme.colors.surfaceSubtle,
    },
    clock: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },
    clockPicker: { alignSelf: 'center', width: 320 },
    weekRow: { flexDirection: 'row' },
    cell: { flex: 1 },
    dayCell: { alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: theme.radius.md },
    dayActive: { backgroundColor: theme.colors.primary },
  });
}
