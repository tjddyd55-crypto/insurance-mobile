import { memo, useMemo } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions, type StyleProp, type ViewStyle } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import { formatDayTitle, monthGrid } from './scheduleModel';
import { monthDayPreview, type ScheduleDayItems, type ScheduleMonthItem } from './scheduleMonthModel';

import { scheduleItemAppearance } from './scheduleItemColors';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

type Props = {
  month: string;
  selected: string;
  today: string;
  viewportHeight: number;
  style?: StyleProp<ViewStyle>;
  days: Map<string, ScheduleDayItems>;
  onSelectDate: (date: string) => void;
  onOpenItem: (item: ScheduleMonthItem, date: string) => void;
};

/** Presentation only. No query, navigation or second scroll container. */
export const ScheduleMonthCalendar = memo(function ScheduleMonthCalendar({
  month, selected, today, viewportHeight, style, days, onSelectDate, onOpenItem,
}: Props) {
  const theme = useAppTheme();
  const { fontScale } = useWindowDimensions();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const weeks = useMemo(() => monthGrid(month), [month]);
  const captionHeight = theme.typography.caption.lineHeight * fontScale;
  const dateHeight = theme.typography.body.lineHeight * fontScale + theme.spacing.xs;
  const chipMinHeight = captionHeight + theme.spacing.xxs;
  // Titles wrap naturally inside the narrow seven-column cell. The page scrolls instead
  // of truncating event names with ellipsis just to keep a fixed row height.
  const minimumHeight = dateHeight + chipMinHeight * 2 + captionHeight + theme.spacing.sm;
  const reservedHeight = theme.controlSize.minimumTouchTarget + theme.spacing.xl + theme.spacing.lg * 2;
  const weekHeight = Math.max(minimumHeight, Math.min(
    minimumHeight + theme.spacing.xl,
    Math.floor((viewportHeight - reservedHeight) / weeks.length),
  ));

  return (
    <View style={[styles.calendar, style]} testID="schedule-month-calendar">
      <View style={styles.weekdays}>
        {WEEKDAYS.map((label, index) => (
          <AppText key={label} variant="caption" align="center" color={index === 0 ? 'danger' : index === 6 ? 'info' : 'textSecondary'} style={styles.column}>
            {label}
          </AppText>
        ))}
      </View>
      {weeks.map((week) => (
        <View key={week[0]!.ymd} style={styles.week} testID="schedule-month-week">
          {week.map((cell, weekday) => {
            const active = cell.ymd === selected;
            const isToday = cell.ymd === today;
            const preview = monthDayPreview(days.get(cell.ymd));
            return (
              <View key={cell.ymd} style={[styles.column, styles.day, { minHeight: weekHeight }, active && styles.selected]} testID={`schedule-day-${cell.ymd}`}>
                {/* Sibling press targets keep chip taps independent of date selection,
                    including VoiceOver: the date button never groups its event buttons. */}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${formatDayTitle(cell.ymd)}${isToday ? ', 오늘' : ''}, 일정 ${preview.total}건`}
                  accessibilityState={{ selected: active }}
                  style={[StyleSheet.absoluteFill, styles.dateTarget]}
                  onPress={() => onSelectDate(cell.ymd)}
                >
                  <View style={[styles.dateNumber, { minHeight: dateHeight, minWidth: dateHeight }, isToday && styles.today]}>
                    <AppText variant="bodyStrong" color={isToday ? 'onPrimary' : !cell.inMonth ? 'textMuted' : weekday === 0 ? 'danger' : weekday === 6 ? 'info' : 'text'}>
                      {cell.day}
                    </AppText>
                  </View>
                </Pressable>
                <View pointerEvents="box-none" style={[styles.previews, { paddingTop: dateHeight + theme.spacing.xxs }]}>
                  {preview.items.map((item) => {
                    const color = scheduleItemAppearance(item, theme.scheme);
                    return (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatDayTitle(cell.ymd)}, ${item.title}, 상세 보기`}
                      style={({ pressed }) => [styles.chip, { minHeight: chipMinHeight, backgroundColor: color.background, borderColor: color.border, opacity: color.opacity * (pressed ? theme.opacity.pressed : 1) }]}
                      onPress={() => onOpenItem(item, cell.ymd)}
                    >
                      <AppText variant="caption" style={{ color: color.foreground, textDecorationLine: color.textDecorationLine }}>{item.title}</AppText>
                    </Pressable>
                    );
                  })}
                  {preview.more > 0 ? (
                    <AppText pointerEvents="none" variant="caption" color="primary" style={styles.more} accessibilityLabel={`일정 ${preview.more}건 더 있음`}>
                      +{preview.more}
                    </AppText>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
});

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    calendar: { backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, borderRadius: theme.radius.md, overflow: 'hidden' },
    column: { flex: 1, minWidth: 0 },
    weekdays: { flexDirection: 'row', paddingVertical: theme.spacing.sm },
    week: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
    day: { borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, paddingHorizontal: theme.spacing.none, paddingBottom: theme.spacing.xs },
    selected: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primarySoft },
    dateTarget: { padding: theme.spacing.xxs, alignItems: 'center' },
    dateNumber: { alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.full },
    today: { backgroundColor: theme.colors.primary },
    previews: { gap: theme.spacing.xxs },
    // Dense seven-column preview exception: compact chips have equivalent full-size
    // targets in the selected day's list. The date target covers the entire cell.
    chip: { borderLeftWidth: theme.spacing.xxs, borderRadius: theme.radius.xs, paddingHorizontal: theme.spacing.xxs, justifyContent: 'center' },
    more: { paddingHorizontal: theme.spacing.xxs },
  });
}
