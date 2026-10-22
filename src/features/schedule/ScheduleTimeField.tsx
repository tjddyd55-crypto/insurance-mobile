import { useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { AppText, Button, Inline, TextField, useAppTheme, type AppTheme } from '../../design-system';

const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;

type ScheduleTimeFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** 할 일 시각처럼 비워 둘 수 있다. 비우면 시각 없음이다. */
  optional?: boolean;
};

/** 고른 시계의 시·분을 HH:mm 으로 넣는다. 기기 시간대 변환은 하지 않는다. */
export function hmFromDate(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export function dateFromHm(value: string): Date {
  const match = HM.exec(value);
  const date = new Date();
  date.setHours(match ? Number(match[1]) : 9, match ? Number(match[2]) : 0, 0, 0);
  return date;
}

/**
 * 시각 칸. Android 는 이미 들어 있는 datetimepicker 의 시계(AM/PM, 키보드 전환은 시스템 다이얼로그).
 * iOS 는 같은 모듈의 스피너와 취소/완료.
 */
export function ScheduleTimeField({ label, value, onChange, optional = false }: ScheduleTimeFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const shown = HM.test(value) ? value : '';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(() => dateFromHm(shown));

  const openPicker = () => {
    setDraft(dateFromHm(shown || '09:00'));
    setOpen(true);
  };
  const commit = (date: Date) => {
    onChange(hmFromDate(date));
    setOpen(false);
  };
  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === 'dismissed') {
      setOpen(false);
      return;
    }
    if (!selected) return;
    setDraft(selected);
    if (Platform.OS === 'android') commit(selected);
  };

  return (
    <View style={styles.flex}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${label} 시계 열기`} onPress={openPicker}>
        <TextField
          label={label}
          value={shown}
          placeholder={optional ? '시간 없음' : '시간 선택'}
          editable={false}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
        />
      </Pressable>
      {optional && shown ? (
        <Pressable accessibilityRole="button" accessibilityLabel={`${label} 지우기`} onPress={() => onChange('')}>
          <AppText variant="caption" color="primary">시간 없음</AppText>
        </Pressable>
      ) : null}
      {open ? (
        <View style={styles.picker}>
          <DateTimePicker
            mode="time"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            value={draft}
            onChange={onPickerChange}
            style={styles.pickerControl}
          />
          {Platform.OS === 'ios' ? (
            <Inline gap="sm" justify="flex-end">
              <Button label="취소" size="sm" onPress={() => setOpen(false)} />
              <Button label="완료" variant="primary" size="sm" onPress={() => commit(draft)} />
            </Inline>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    flex: { flex: 1 },
    picker: { width: '100%', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm },
    pickerControl: { alignSelf: 'center', width: 320 },
  });
}
