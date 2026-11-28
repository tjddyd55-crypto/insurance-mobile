import { Pressable, StyleSheet, View } from 'react-native';

import { AppText, Card, useAppTheme } from '../../design-system';
import { formatDayTitle } from '../schedule/scheduleModel';
import { buildEducationCalendar, educationDayTone } from './educationScheduleModel';

const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
const toneColors = { sunday: 'danger', saturday: 'info', weekday: 'text' } as const;

type Props = {
  weeks: ReturnType<typeof buildEducationCalendar>;
  selectedDate: string;
  onSelect: (date: string) => void;
};

export function EducationScheduleCalendar({ weeks, selectedDate, onSelect }: Props) {
  const theme = useAppTheme();

  return (
    <Card variant="outlined" padding="none" style={styles.calendar}>
      <View style={styles.week}>
        {weekdays.map((day, weekday) => (
          <AppText key={day} variant="label" align="center" style={styles.weekday} color={toneColors[educationDayTone(weekday)]}>
            {day}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0].ymd} style={[styles.week, { borderTopColor: theme.colors.border, borderTopWidth: StyleSheet.hairlineWidth }]}>
          {week.map((cell) => {
            if (!cell.inMonth) return <View key={cell.ymd} style={styles.cell} />;
            const selected = selectedDate === cell.ymd;
            const [first] = cell.schedules;
            return (
              <Pressable
                key={cell.ymd}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={[formatDayTitle(cell.ymd), cell.holiday, `교육일정 ${cell.schedules.length}건`].filter(Boolean).join(', ')}
                onPress={() => onSelect(cell.ymd)}
                style={({ pressed }) => [
                  styles.cell,
                  { borderColor: selected ? theme.colors.primary : 'transparent' },
                  (selected || pressed) && { backgroundColor: theme.colors.surfaceSubtle },
                ]}
              >
                <AppText variant="bodyStrong" color={toneColors[cell.tone]} align="center">{cell.day}</AppText>
                {cell.holiday ? <AppText variant="caption" color="danger" align="center" numberOfLines={1}>{cell.holiday}</AppText> : null}
                {first ? (
                  <>
                    <AppText variant="caption" color="text" align="center" numberOfLines={1}>{first.title}</AppText>
                    {first.instructor ? <AppText variant="caption" color="textSecondary" align="center" numberOfLines={1}>{first.instructor}</AppText> : null}
                    {cell.schedules.length > 1 ? <AppText variant="caption" align="center">+{cell.schedules.length - 1}</AppText> : null}
                  </>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  calendar: { overflow: 'hidden' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, paddingVertical: 6 },
  cell: { flex: 1, minWidth: 0, minHeight: 66, paddingHorizontal: 1, paddingVertical: 3, borderWidth: 1 },
});
