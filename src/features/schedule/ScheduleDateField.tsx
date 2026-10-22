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
  /** 할 일 예정일처럼 비워 둘 수 있다. */
  clearable?: boolean;
  placeholder?: string;
};

/** 일정·할 일 날짜. 칸의 YYYY-MM-DD 문자열을 그대로 넣는다. */
export function ScheduleDateField({ label, value, onChange, clearable = false, placeholder = '날짜 선택' }: ScheduleDateFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => monthAnchor(value));
  const stored = YMD.test(value) ? value : '';

  const openPicker = () => {
    setMonth(monthAnchor(stored));
    setOpen(true);
  };
  const choose = (ymd: string) => {
    onChange(ymd);
    setOpen(false);
  };

  return (
    <View style={styles.flex}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 달력 열기`} onPress={openPicker}>
        <TextField label={label} value={stored} placeholder={placeholder} editable={false} pointerEvents="none" importantForAccessibility="no-hide-descendants" />
      </Pressable>
      <ModalShell open={open} title={label} presentation="dialog" scroll onRequestClose={() => setOpen(false)}>
        <StackMonth month={month} value={stored} styles={styles} onMonth={setMonth} onChoose={choose} />
        {clearable ? <Button label="날짜 없음" variant="ghost" onPress={() => choose('')} /> : null}
      </ModalShell>
    </View>
  );
}

function monthAnchor(value: string): string {
  const base = YMD.test(value) ? value : seoulYmd();
  return `${base.slice(0, 7)}-01`;
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
