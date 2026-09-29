import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText, useAppTheme, type AppTheme } from '../../design-system';
import { formatCustomerDetailDate, formatCustomerDetailValue } from './customerDetailPresentation';

type VehicleInfoValues = {
  carNumber?: string | null;
  carType?: string | null;
  carYear?: string | null;
  renewalDate?: string | null;
};

const FIELDS: { key: keyof VehicleInfoValues; label: string; date?: boolean }[] = [
  { key: 'carNumber', label: '차량 번호' },
  { key: 'carType', label: '차종' },
  { key: 'carYear', label: '연식' },
  { key: 'renewalDate', label: '갱신 예정일', date: true },
];

function formatValue(value: string | null | undefined, date: boolean): string {
  if (date) {
    return formatCustomerDetailDate(value ?? null);
  }
  return formatCustomerDetailValue(value ?? null);
}

export function VehicleInfoGrid({ values }: { values: VehicleInfoValues }) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.grid}>
      {FIELDS.map((field) => (
        <View key={field.key} style={styles.cell}>
          <AppText variant="body" color="textSecondary">
            {field.label}
          </AppText>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {formatValue(values[field.key], Boolean(field.date))}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
    },
    cell: {
      width: '48%',
      minWidth: 0,
      gap: theme.spacing.xxs,
      paddingVertical: theme.spacing.xs,
    },
  });
}
