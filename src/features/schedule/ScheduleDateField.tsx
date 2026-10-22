import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, Card, Inline, ModalShell, TextField, useAppTheme, type AppTheme } from '../../design-system';
import { formatDayTitle, formatMonthTitle, monthGrid, seoulYmd, shiftMonth } from './scheduleModel';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const YMD = /^\d{4}-\d{2}-\d{2}$/;

type ScheduleDateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 할 일 날짜처럼 비워 둘 수 있다. */
  clearable?: boolean;
  placeholder?: string;
};

/** 일정·할 일 날짜. 칸을 고른 뒤 완료를 눌러야 YYYY-MM-DD 가 반영된다. */
export function ScheduleDateField({ label, value, onChange, clearable = false, placeholder = '날짜 선택' }: ScheduleDateFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [pickerKey, setPickerKey] = useState(0);
  const stored = YMD.test(value) ? value : '';

  const openPicker = () => {
    setDraft(stored);
    setPickerKey((key) => key + 1);
    setOpen(true);
  };
  const cancel = () => setOpen(false);
  const commit = () => {
    onChange(draft);
    setOpen(false);
  };

  return (
    <View style={styles.flex}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 달력 열기`} onPress={openPicker}>
        <TextField label={label} value={stored} placeholder={placeholder} editable={false} pointerEvents="none" importantForAccessibility="no-hide-descendants" />
      </Pressable>
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
        {clearable ? <Button label="날짜 없음" variant="ghost" onPress={() => setDraft('')} /> : null}
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
    weekRow: { flexDirection: 'row' },
    cell: { flex: 1 },
    dayCell: { alignItems: 'center', justifyContent: 'center', minHeight: 40, borderRadius: theme.radius.md },
    dayActive: { backgroundColor: theme.colors.primary },
  });
}
