import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Button, TextField, useAppTheme, type AppTheme } from '../../design-system';

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

type Meridiem = 'am' | 'pm';
type ClockParts = { hour12: number; minute: number; meridiem: Meridiem };

type ScheduleTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
};

const FALLBACK: ClockParts = { hour12: 9, minute: 0, meridiem: 'am' };

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseClock(value: string): ClockParts | null {
  const match = HM.exec(value.trim());
  if (!match) return null;
  const hour24 = Number(match[1]);
  const minute = Number(match[2]);
  return {
    hour12: hour24 % 12 === 0 ? 12 : hour24 % 12,
    minute,
    meridiem: hour24 >= 12 ? 'pm' : 'am',
  };
}

export function clockToHm(parts: ClockParts): string {
  const hour12 = Math.min(12, Math.max(1, parts.hour12));
  const minute = Math.min(59, Math.max(0, parts.minute));
  const hour24 = parts.meridiem === 'pm' ? (hour12 % 12) + 12 : hour12 % 12;
  return `${pad2(hour24)}:${pad2(minute)}`;
}

/** 화면 문구. 저장값은 24시간 HH:mm. */
export function formatKoreanClock(value: string): string {
  const parts = parseClock(value);
  if (!parts) return '';
  return `${parts.meridiem === 'am' ? '오전' : '오후'} ${parts.hour12}:${pad2(parts.minute)}`;
}

export function hmFromDate(date: Date): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function dateFromHm(value: string): Date {
  const match = HM.exec(value);
  const date = new Date();
  date.setHours(match ? Number(match[1]) : 9, match ? Number(match[2]) : 0, 0, 0);
  return date;
}

function shiftHour(parts: ClockParts, delta: number): ClockParts {
  const hour12 = ((parts.hour12 - 1 + delta) % 12 + 12) % 12 + 1;
  return { ...parts, hour12 };
}

function shiftMinute(parts: ClockParts, delta: number): ClockParts {
  return { ...parts, minute: (parts.minute + delta + 60) % 60 };
}

/**
 * 시·분·오전/오후를 한 줄에 고른다. HH:mm 직접 입력은 없다.
 * 고른 값은 24시간 HH:mm 으로 올린다.
 */
export function ScheduleTimeField({ label, value, onChange }: ScheduleTimeFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [open, setOpen] = useState(false);
  const parts = parseClock(value) ?? FALLBACK;
  const commit = (next: ClockParts) => onChange(clockToHm(next));

  return (
    <View style={styles.flex}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 시간 열기`} onPress={() => setOpen((current) => !current)}>
        <TextField
          label={label}
          value={formatKoreanClock(value)}
          placeholder="시간 선택"
          editable={false}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      {open ? (
        <View style={styles.line} accessibilityRole="adjustable" accessibilityLabel={`${label} 시간 선택`}>
          <AppText variant="caption" color="textSecondary">시</AppText>
          <Button label="−" size="sm" accessibilityLabel="시 내리기" onPress={() => commit(shiftHour(parts, -1))} />
          <AppText variant="bodyStrong" align="center" style={styles.digit}>{parts.hour12}</AppText>
          <Button label="+" size="sm" accessibilityLabel="시 올리기" onPress={() => commit(shiftHour(parts, 1))} />
          <AppText variant="bodyStrong">:</AppText>
          <AppText variant="caption" color="textSecondary">분</AppText>
          <Button label="−" size="sm" accessibilityLabel="분 내리기" onPress={() => commit(shiftMinute(parts, -1))} />
          <AppText variant="bodyStrong" align="center" style={styles.digit}>{pad2(parts.minute)}</AppText>
          <Button label="+" size="sm" accessibilityLabel="분 올리기" onPress={() => commit(shiftMinute(parts, 1))} />
          <Button
            label="오전"
            size="sm"
            variant={parts.meridiem === 'am' ? 'selected' : 'secondary'}
            accessibilityState={{ selected: parts.meridiem === 'am' }}
            onPress={() => commit({ ...parts, meridiem: 'am' })}
          />
          <Button
            label="오후"
            size="sm"
            variant={parts.meridiem === 'pm' ? 'selected' : 'secondary'}
            accessibilityState={{ selected: parts.meridiem === 'pm' }}
            onPress={() => commit({ ...parts, meridiem: 'pm' })}
          />
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    line: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'nowrap',
      gap: theme.spacing.xs,
      paddingVertical: theme.spacing.sm,
    },
    digit: { minWidth: 28, textAlign: 'center' },
  });
}
