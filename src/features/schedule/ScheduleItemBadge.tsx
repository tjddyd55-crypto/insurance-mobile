import { View } from 'react-native';
import { AppText, useAppTheme } from '../../design-system';
import { scheduleItemAppearance, type ScheduleColorItem } from './scheduleItemColors';

/** A source label, not an action or a legend. */
export function ScheduleItemBadge({ item, label, inheritOpacity = false }: { item: ScheduleColorItem; label: string; inheritOpacity?: boolean }) {
  const theme = useAppTheme();
  const color = scheduleItemAppearance(item, theme.scheme);
  return <View style={{ backgroundColor: color.background, borderColor: color.border, borderWidth: 1, borderRadius: theme.radius.full, paddingHorizontal: theme.spacing.sm, paddingVertical: theme.spacing.xxs, opacity: inheritOpacity ? 1 : color.opacity }}>
    <AppText variant="caption" style={{ color: color.foreground, textDecorationLine: color.textDecorationLine }}>{label}</AppText>
  </View>;
}
