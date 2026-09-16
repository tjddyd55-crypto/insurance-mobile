import { useMemo, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type ViewStyle } from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { AppText, TextField, useAppTheme, type AppTheme } from "../design-system";
import {
  coerceStoredDateValue,
  dateToYmd,
  formatDateForDisplay,
  ymdToDate,
} from "../utils/dateInput";

type DateFieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  clearable?: boolean;
  testID?: string;
  containerStyle?: ViewStyle;
};

export function DateField({
  label,
  value,
  onChange,
  disabled = false,
  required = false,
  error,
  helperText,
  minimumDate,
  maximumDate,
  clearable = true,
  testID,
  containerStyle,
}: DateFieldProps) {
  const theme = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const storedValue = coerceStoredDateValue(value);
  const displayValue = formatDateForDisplay(storedValue);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date>(() => ymdToDate(storedValue) ?? new Date());

  const openPicker = () => {
    if (disabled) {
      return;
    }
    setDraftDate(ymdToDate(storedValue) ?? new Date());
    setOpen(true);
  };

  const commitDate = (next: Date) => {
    onChange(dateToYmd(next));
    setOpen(false);
  };

  const handleChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (event.type === "dismissed") {
      setOpen(false);
      return;
    }
    if (!selected) {
      return;
    }
    setDraftDate(selected);
    if (Platform.OS === "android") {
      commitDate(selected);
    }
  };

  return (
    <View style={[styles.wrap, containerStyle]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        disabled={disabled}
        onPress={openPicker}
        testID={testID}
      >
        <TextField
          label={label}
          value={displayValue}
          placeholder="날짜 선택"
          editable={false}
          required={required}
          error={error}
          helperText={helperText}
          pointerEvents="none"
        />
      </Pressable>
      {clearable && storedValue && !disabled ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${label} 지우기`}
          onPress={() => onChange("")}
          style={styles.clearAction}
        >
          <AppText variant="caption" color="primary">날짜 지우기</AppText>
        </Pressable>
      ) : null}
      {open ? (
        <View style={styles.pickerWrap}>
          <DateTimePicker
            value={draftDate}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "default"}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onChange={handleChange}
          />
          {Platform.OS === "ios" ? (
            <View style={styles.iosActions}>
              <Pressable accessibilityRole="button" onPress={() => setOpen(false)}>
                <AppText variant="body" color="textSecondary">취소</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => commitDate(draftDate)}>
                <AppText variant="body" color="primary">확인</AppText>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(theme: AppTheme) {
  return StyleSheet.create({
    wrap: {
      gap: theme.spacing.xs,
    },
    clearAction: {
      alignSelf: "flex-start",
      paddingVertical: theme.spacing.xs,
    },
    pickerWrap: {
      gap: theme.spacing.sm,
    },
    iosActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: theme.spacing.md,
      paddingBottom: theme.spacing.xs,
    },
  });
}
